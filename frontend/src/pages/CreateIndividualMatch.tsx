import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Zap, Search, X, ChevronRight, ChevronLeft,
  ShieldCheck, Loader2, UserPlus, Trophy, MapPin,
  Calendar, Clock, User, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MatchAPI, UserAPI } from '@/services/api';
import EntitySearch from '@/components/ui/EntitySearch';

// ── Reused PlayerSlot component (unchanged) ─────────────────────────────────
const PlayerSlot = ({
  label, selectedPlayer, searchQuery, onSearchChange, onSelect, onRemove, registeredAthletes, compact = false
}: {
  label: string; selectedPlayer: any; searchQuery: string;
  onSearchChange: (v: string) => void; onSelect: (p: any) => void;
  onRemove: () => void; registeredAthletes: any[]; compact?: boolean;
}) => {
  const filtered = registeredAthletes.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.smashId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.smash_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="space-y-3">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</Label>
      <div className="relative">
        {!selectedPlayer ? (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input placeholder="Search Name or ID"
              className={cn('bg-white border-slate-100 rounded-2xl pl-11 font-bold focus:border-sky-500 shadow-sm', compact ? 'h-12 text-xs' : 'h-14')}
              value={searchQuery} onChange={e => onSearchChange(e.target.value)} />
            <AnimatePresence>
              {searchQuery && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden p-2">
                  {filtered.slice(0, 3).map(p => (
                    <button key={p.id || p.mobile} onClick={() => onSelect(p)}
                      className="w-full p-3 flex items-center gap-4 hover:bg-slate-50 rounded-2xl transition-all text-left group">
                      <div className="h-8 w-8 rounded-full bg-[#0B1F3A] flex items-center justify-center text-[10px] font-black text-sky-500 uppercase">{p.name[0]}</div>
                      <div className="flex-1">
                        <p className="font-black text-xs text-[#0B1F3A] group-hover:text-sky-600">{p.name}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase">{p.smash_id || p.smashId || 'Dossier Active'}</p>
                      </div>
                      <ShieldCheck className="h-3 w-3 text-sky-500" />
                    </button>
                  ))}
                  <button onClick={() => onSelect({ name: searchQuery, isGuest: true, id: 'guest_' + Date.now() })}
                    className="w-full p-3 flex items-center gap-4 hover:bg-sky-50 rounded-2xl transition-all text-left border-t border-slate-50 mt-1">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><UserPlus className="h-4 w-4" /></div>
                    <div className="flex-1">
                      <p className="font-black text-xs text-[#0B1F3A]">Use "{searchQuery}"</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase italic">Add as Guest</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className={cn('bg-[#0B1F3A] rounded-[2rem] px-5 flex items-center justify-between border border-sky-500/20 shadow-2xl', compact ? 'h-20' : 'h-24')}>
            <div className="flex items-center gap-4">
              <div className={cn('rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center font-black text-sky-400', compact ? 'h-10 w-10 text-xs' : 'h-14 w-14 text-sm')}>
                {selectedPlayer.name[0].toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className={cn('font-black text-white leading-tight uppercase italic', compact ? 'text-sm' : 'text-lg')}>{selectedPlayer.name}</p>
                  {!selectedPlayer.isGuest && <ShieldCheck className="h-3 w-3 text-sky-500" />}
                </div>
                <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest">
                  {selectedPlayer.isGuest ? 'Guest' : (selectedPlayer.smash_id || 'Athlete')}
                </p>
              </div>
            </div>
            <button onClick={onRemove} className="h-8 w-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ── Toss coin animation ───────────────────────────────────────────────────────
const CoinFlip = ({ result, flipping }: { result: 'heads' | 'tails' | null; flipping: boolean }) => (
  <motion.div
    animate={flipping ? { rotateY: [0, 720, 1440, 1800] } : {}}
    transition={{ duration: 1.2, ease: 'easeOut' }}
    className={cn(
      'h-28 w-28 rounded-full mx-auto flex items-center justify-center font-black text-2xl shadow-2xl border-4 transition-colors',
      result === 'heads' ? 'bg-amber-500 border-amber-300 text-white' :
      result === 'tails' ? 'bg-slate-700 border-slate-500 text-white' :
      'bg-slate-100 border-slate-200 text-slate-400'
    )}
  >
    {flipping ? '🪙' : result ? (result === 'heads' ? 'H' : 'T') : '🪙'}
  </motion.div>
);

// ── Commentary generator for toss ─────────────────────────────────────────────
function tossCommentary(
  p1: string, p2: string,
  call: string, result: string,
  winner: string, choice: string
): string[] {
  const won  = call === result ? p1 : p2;
  const lost = call === result ? p2 : p1;
  return [
    `The teams are ready. ${p1} calls ${call.toUpperCase()}.`,
    `The coin spins in the air... it lands on ${result.toUpperCase()}!`,
    `${won} wins the toss! ${lost} will have to respond.`,
    `${won} chooses to ${choice}. The stage is set — let the battle begin! 🏸`,
  ];
}

// ── Step indicator ─────────────────────────────────────────────────────────────
const PHASES = ['Players', 'Config', 'Toss'];

const PhaseBar = ({ phase }: { phase: number }) => (
  <div className="flex items-center gap-2 mb-6">
    {PHASES.map((label, i) => (
      <React.Fragment key={i}>
        <div className="flex items-center gap-1.5">
          <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all',
            i < phase  ? 'bg-sky-500 text-white' :
            i === phase ? 'bg-[#0B1F3A] text-white' : 'bg-slate-100 text-slate-400')}>
            {i < phase ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn('text-[9px] font-black uppercase tracking-widest hidden sm:block',
            i === phase ? 'text-[#0B1F3A]' : 'text-slate-300')}>{label}</span>
        </div>
        {i < PHASES.length - 1 && <div className={cn('flex-1 h-px', i < phase ? 'bg-sky-500' : 'bg-slate-100')} />}
      </React.Fragment>
    ))}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const CreateIndividualMatch = () => {
  const navigate     = useNavigate();
  const [phase, setPhase]           = useState(0);  // 0=players 1=config 2=toss
  const [isCreating, setIsCreating] = useState(false);
  const [registeredAthletes, setRegisteredAthletes] = useState<any[]>([]);

  // Phase 1 state
  const [matchType, setMatchType] = useState<'singles' | 'doubles' | 'mixed'>('singles');
  const [selectedPlayers, setSelectedPlayers] = useState<Record<string, any>>({
    p1: null, p2: null, tA1: null, tA2: null, tB1: null, tB2: null
  });
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({
    p1: '', p2: '', tA1: '', tA2: '', tB1: '', tB2: ''
  });

  // Phase 2 state
  const [config, setConfig] = useState({
    name: 'Friendly Match', category: 'Friendly', sets: '3',
    court: '', courtType: '', city: '', venue: '',
    date: '', time: '', official: '',
  });

  // Phase 3 state
  const [tossCalled, setTossCalled]     = useState<'heads' | 'tails' | ''>('');
  const [tossResult, setTossResult]     = useState<'heads' | 'tails' | null>(null);
  const [tossWinner, setTossWinner]     = useState<'sideA' | 'sideB' | null>(null);
  const [tossChoice, setTossChoice]     = useState('');
  const [flipping, setFlipping]         = useState(false);
  const [commentary, setCommentary]     = useState<string[]>([]);
  const [commentIdx, setCommentIdx]     = useState(0);
  const commentTimer = useRef<any>(null);

  useEffect(() => {
    UserAPI.getAll()
      .then(data => { if (data.length > 0) setRegisteredAthletes(data); })
      .catch(() => {
        const local = JSON.parse(localStorage.getItem('registered_users') || '[]');
        setRegisteredAthletes(local);
      });
  }, []);

  // Auto-advance commentary lines
  useEffect(() => {
    if (commentary.length === 0) return;
    if (commentIdx < commentary.length - 1) {
      commentTimer.current = setTimeout(() => setCommentIdx(i => i + 1), 1800);
    }
    return () => clearTimeout(commentTimer.current);
  }, [commentary, commentIdx]);

  // ── Phase 1 validation ──────────────────────────────────────────────────────
  const phase1Valid = () => {
    const isDoubles = matchType !== 'singles';
    const all = isDoubles
      ? [selectedPlayers.tA1, selectedPlayers.tA2, selectedPlayers.tB1, selectedPlayers.tB2]
      : [selectedPlayers.p1, selectedPlayers.p2];
    if (all.some(p => !p)) return false;
    const ids = all.map((p: any) => p.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) return false;
    if (isDoubles) {
      const sideAIds = new Set([selectedPlayers.tA1?.id, selectedPlayers.tA2?.id].filter(Boolean));
      for (const p of [selectedPlayers.tB1, selectedPlayers.tB2]) {
        if (p?.id && sideAIds.has(p.id)) return false;
      }
    }
    return true;
  };

  const goPhase1 = () => {
    const isDoubles = matchType !== 'singles';
    const all = isDoubles
      ? [selectedPlayers.tA1, selectedPlayers.tA2, selectedPlayers.tB1, selectedPlayers.tB2]
      : [selectedPlayers.p1, selectedPlayers.p2];
    if (all.some(p => !p)) { showError(isDoubles ? 'Select all 4 players' : 'Select both players'); return; }
    const ids = all.map((p: any) => p.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) { showError('Duplicate player detected'); return; }
    if (isDoubles) {
      const sideAIds = new Set([selectedPlayers.tA1?.id, selectedPlayers.tA2?.id].filter(Boolean));
      for (const p of [selectedPlayers.tB1, selectedPlayers.tB2]) {
        if (p?.id && sideAIds.has(p.id)) { showError('Same player cannot be on both sides'); return; }
      }
    }
    setPhase(1);
  };

  // ── Toss logic ───────────────────────────────────────────────────────────────
  const flipCoin = () => {
    if (!tossCalled) { showError('Side A must call heads or tails first'); return; }
    setFlipping(true);
    setTimeout(() => {
      const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
      const winner: 'sideA' | 'sideB' = tossCalled === result ? 'sideA' : 'sideB';
      setTossResult(result);
      setTossWinner(winner);
      setFlipping(false);
    }, 1300);
  };

  // ── Phase 2 → next: detect future vs now ───────────────────────────────────
  const goPhase2 = () => {
    if (!config.name) { showError('Match name required'); return; }

    // If both date and time are set and the datetime is in the future, skip Toss
    if (config.date && config.time) {
      const scheduledAt = new Date(`${config.date}T${config.time}:00`);
      if (scheduledAt > new Date()) {
        handleScheduleMatch(scheduledAt);
        return;
      }
    }
    // Current/past time or no date → proceed to Toss
    setPhase(2);
  };

  // ── Create a SCHEDULED match (future date) ────────────────────────────────
  const handleScheduleMatch = async (scheduledAt: Date) => {
    setIsCreating(true);
    const isDoubles = matchType !== 'singles';
    const finalPlayers = isDoubles
      ? { sideA: [selectedPlayers.tA1, selectedPlayers.tA2], sideB: [selectedPlayers.tB1, selectedPlayers.tB2] }
      : { p1: selectedPlayers.p1, p2: selectedPlayers.p2 };

    try {
      await MatchAPI.create({
        name:       config.name,
        players:    finalPlayers,
        match_type: matchType,
        category:   config.category === 'Competitive' ? 'competitive' : 'friendly',
        court:      config.court,
        total_sets: parseInt(config.sets),
        scheduledAt: scheduledAt.toISOString(),
      });
      showSuccess('Match scheduled!');
      navigate('/live-match/active', { replace: true });
    } catch (err: any) {
      showError(err.message || 'Could not schedule match');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Start match after toss ────────────────────────────────────────────────────
  const handleStartMatch = async () => {
    if (!tossResult || !tossWinner || !tossChoice) { showError('Complete the toss first'); return; }

    const p1Name = selectedPlayers.p1?.name || selectedPlayers.tA1?.name || 'Side A';
    const p2Name = selectedPlayers.p2?.name || selectedPlayers.tB1?.name || 'Side B';
    const lines  = tossCommentary(p1Name, p2Name, tossCalled, tossResult, tossWinner === 'sideA' ? p1Name : p2Name, tossChoice);
    setCommentary(lines);
    setCommentIdx(0);
    setIsCreating(true);

    const isDoubles = matchType !== 'singles';
    const finalPlayers = isDoubles
      ? { sideA: [selectedPlayers.tA1, selectedPlayers.tA2], sideB: [selectedPlayers.tB1, selectedPlayers.tB2] }
      : { p1: selectedPlayers.p1, p2: selectedPlayers.p2 };

    const matchPayload = {
      name:       config.name,
      players:    finalPlayers,
      match_type: matchType,
      category:   config.category === 'Competitive' ? 'competitive' : 'friendly',
      court:      config.court,
      total_sets: parseInt(config.sets),
      toss: {
        winner:     tossWinner,
        result:     tossResult,
        call:       tossCalled,
        choice:     tossChoice,
        official:   config.official,
        venue:      config.venue,
        city:       config.city,
        court_type: config.courtType,
        date:       config.date,
        time:       config.time,
      },
    };

    // Navigate after commentary regardless of backend success
    const navigateAfterDelay = (matchId: string) => {
      const delay = Math.max(2000, lines.length * 1600);
      setTimeout(() => navigate(`/scoring/${matchId}`, { replace: true }), delay);
    };

    try {
      const created = await MatchAPI.create(matchPayload);
      const cloudId = created._id || created.id;
      await MatchAPI.start(cloudId).catch(() => {});
      navigateAfterDelay(cloudId);
    } catch {
      // Backend unavailable — use local match ID so scoring still works
      const localId = `local_${Date.now()}`;
      const localMatch = {
        ...matchPayload,
        id: localId,
        _id: localId,
        status: 'live',
        current_score: [0, 0],
        sets_won: [0, 0],
        current_game: 1,
        serving: 1,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(localId, JSON.stringify(localMatch));
      // Add to cache so Smashed/LiveMatch pages can find it
      const cached = JSON.parse(localStorage.getItem('cache_matches') || '[]');
      cached.unshift(localMatch);
      localStorage.setItem('cache_matches', JSON.stringify(cached));
      const cachedLive = JSON.parse(localStorage.getItem('cache_matches_live') || '[]');
      cachedLive.unshift(localMatch);
      localStorage.setItem('cache_matches_live', JSON.stringify(cachedLive));
      navigateAfterDelay(localId);
    }
  };

  const p1Name = selectedPlayers.p1?.name || selectedPlayers.tA1?.name || 'Side A';
  const p2Name = selectedPlayers.p2?.name || selectedPlayers.tB1?.name || 'Side B';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <main className="container max-w-2xl px-4 py-8 space-y-6">

        <div className="space-y-1">
          <h1 className="text-4xl font-black text-[#0B1F3A] uppercase italic leading-none">New Match</h1>
          <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">{PHASES[phase]}</p>
        </div>

        <PhaseBar phase={phase} />

        <AnimatePresence mode="wait">

          {/* ── PHASE 1: Player Selection ────────────────────────────────── */}
          {phase === 0 && (
            <motion.div key="phase1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-5 shadow-sm">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Match Type</Label>
                  <Select value={matchType} onValueChange={(v: any) => setMatchType(v)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="singles">Singles</SelectItem>
                      <SelectItem value="doubles">Doubles</SelectItem>
                      <SelectItem value="mixed">Mixed Doubles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {matchType === 'singles' ? (
                  <div className="grid gap-6">
                    <PlayerSlot label="Side A Athlete" selectedPlayer={selectedPlayers.p1} searchQuery={searchQueries.p1}
                      onSearchChange={v => setSearchQueries(p => ({ ...p, p1: v }))}
                      onSelect={p => { setSelectedPlayers(s => ({ ...s, p1: p })); setSearchQueries(q => ({ ...q, p1: '' })); }}
                      onRemove={() => setSelectedPlayers(s => ({ ...s, p1: null }))} registeredAthletes={registeredAthletes} />
                    <PlayerSlot label="Side B Athlete" selectedPlayer={selectedPlayers.p2} searchQuery={searchQueries.p2}
                      onSearchChange={v => setSearchQueries(p => ({ ...p, p2: v }))}
                      onSelect={p => { setSelectedPlayers(s => ({ ...s, p2: p })); setSearchQueries(q => ({ ...q, p2: '' })); }}
                      onRemove={() => setSelectedPlayers(s => ({ ...s, p2: null }))} registeredAthletes={registeredAthletes} />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2"><div className="h-1 w-6 bg-sky-500 rounded-full" /><span className="text-[10px] font-black uppercase text-[#0B1F3A]">Side A</span></div>
                      <div className="grid gap-4">
                        {(['tA1', 'tA2'] as const).map((k, i) => (
                          <PlayerSlot key={k} label={`Partner 0${i + 1}`} selectedPlayer={selectedPlayers[k]} searchQuery={searchQueries[k]}
                            onSearchChange={v => setSearchQueries(p => ({ ...p, [k]: v }))}
                            onSelect={p => { setSelectedPlayers(s => ({ ...s, [k]: p })); setSearchQueries(q => ({ ...q, [k]: '' })); }}
                            onRemove={() => setSelectedPlayers(s => ({ ...s, [k]: null }))} registeredAthletes={registeredAthletes} compact />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2"><div className="h-1 w-6 bg-indigo-500 rounded-full" /><span className="text-[10px] font-black uppercase text-[#0B1F3A]">Side B</span></div>
                      <div className="grid gap-4">
                        {(['tB1', 'tB2'] as const).map((k, i) => (
                          <PlayerSlot key={k} label={`Partner 0${i + 1}`} selectedPlayer={selectedPlayers[k]} searchQuery={searchQueries[k]}
                            onSearchChange={v => setSearchQueries(p => ({ ...p, [k]: v }))}
                            onSelect={p => { setSelectedPlayers(s => ({ ...s, [k]: p })); setSearchQueries(q => ({ ...q, [k]: '' })); }}
                            onRemove={() => setSelectedPlayers(s => ({ ...s, [k]: null }))} registeredAthletes={registeredAthletes} compact />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={goPhase1} disabled={!phase1Valid()}
                className="w-full h-16 bg-[#0B1F3A] text-white font-black text-lg rounded-[2rem] shadow-xl hover:bg-sky-500 transition-all gap-2">
                Next: Match Config <ChevronRight className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* ── PHASE 2: Match Configuration ─────────────────────────────── */}
          {phase === 1 && (
            <motion.div key="phase2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-5 shadow-sm">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Match Name</Label>
                    <Input value={config.name} onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                    <Select value={config.category} onValueChange={v => setConfig(c => ({ ...c, category: v }))}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Friendly">Friendly</SelectItem>
                        <SelectItem value="Competitive">Competitive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Sets</Label>
                    <Select value={config.sets} onValueChange={v => setConfig(c => ({ ...c, sets: v }))}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="1">1 Set</SelectItem>
                        <SelectItem value="3">Best of 3</SelectItem>
                        <SelectItem value="5">Best of 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <EntitySearch
                    type="city" label="City / Town"
                    value={config.city}
                    onChange={v => setConfig(c => ({ ...c, city: v }))}
                    placeholder="e.g. Mumbai"
                  />

                  <EntitySearch
                    type="venue" label="Venue / Ground"
                    value={config.venue}
                    onChange={v => setConfig(c => ({ ...c, venue: v }))}
                    placeholder="e.g. Nehru Stadium"
                    context={{ city: config.city }}
                  />

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Court No.</Label>
                    <Input value={config.court} onChange={e => setConfig(c => ({ ...c, court: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" placeholder="01" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Court Type</Label>
                    <Select value={config.courtType} onValueChange={v => setConfig(c => ({ ...c, courtType: v }))}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="synthetic">Synthetic</SelectItem>
                        <SelectItem value="wooden">Wooden</SelectItem>
                        <SelectItem value="concrete">Concrete</SelectItem>
                        <SelectItem value="grass">Grass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Date</Label>
                    <Input type="date" value={config.date} onChange={e => setConfig(c => ({ ...c, date: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Time</Label>
                    <Input type="time" value={config.time} onChange={e => setConfig(c => ({ ...c, time: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Match Official (optional)</Label>
                    <Input value={config.official} onChange={e => setConfig(c => ({ ...c, official: e.target.value }))}
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" placeholder="Umpire / Referee name" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setPhase(0)} variant="outline" className="h-16 px-6 rounded-[2rem] font-black text-[10px] uppercase border-slate-200 gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={goPhase2}
                  className="flex-1 h-16 bg-[#0B1F3A] text-white font-black text-lg rounded-[2rem] shadow-xl hover:bg-sky-500 transition-all gap-2">
                  {config.date && config.time && new Date(`${config.date}T${config.time}:00`) > new Date()
                    ? <><Calendar className="h-5 w-5" /> Schedule Match</>
                    : <>Next: Toss <ChevronRight className="h-5 w-5" /></>
                  }
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── PHASE 3: Toss ────────────────────────────────────────────── */}
          {phase === 2 && (
            <motion.div key="phase3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm text-center">
                <h3 className="text-xl font-black text-[#0B1F3A] uppercase italic">Coin Toss</h3>

                {/* Players */}
                <div className="flex items-center justify-between gap-4 px-2">
                  <div className="text-center flex-1">
                    <div className="h-12 w-12 rounded-full bg-sky-500 flex items-center justify-center font-black text-white text-lg uppercase mx-auto mb-1">{p1Name[0]}</div>
                    <p className="text-xs font-black text-[#0B1F3A] uppercase truncate">{p1Name}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Side A</p>
                  </div>
                  <Zap className="h-5 w-5 text-sky-400 fill-current shrink-0" />
                  <div className="text-center flex-1">
                    <div className="h-12 w-12 rounded-full bg-[#0B1F3A] flex items-center justify-center font-black text-sky-400 text-lg uppercase mx-auto mb-1">{p2Name[0]}</div>
                    <p className="text-xs font-black text-[#0B1F3A] uppercase truncate">{p2Name}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Side B</p>
                  </div>
                </div>

                {/* Coin */}
                <CoinFlip result={tossResult} flipping={flipping} />
                {tossResult && (
                  <p className="text-lg font-black text-[#0B1F3A] uppercase italic">
                    {tossResult.toUpperCase()}! — {tossWinner === 'sideA' ? p1Name : p2Name} wins the toss
                  </p>
                )}

                {/* Side A calls */}
                {!tossResult && !flipping && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p1Name} calls:</p>
                    <div className="flex gap-3 justify-center">
                      {(['heads', 'tails'] as const).map(c => (
                        <button key={c} onClick={() => setTossCalled(c)}
                          className={cn('h-12 px-8 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all',
                            tossCalled === c ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-sky-300')}>
                          {c}
                        </button>
                      ))}
                    </div>
                    <Button onClick={flipCoin} disabled={!tossCalled} className="w-full h-14 bg-[#0B1F3A] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-sky-500 transition-all">
                      Flip Coin 🪙
                    </Button>
                  </div>
                )}

                {/* Toss winner's choice */}
                {tossResult && !tossChoice && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {tossWinner === 'sideA' ? p1Name : p2Name} chooses to:
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      {['serve', 'receive', 'side'].map(c => (
                        <button key={c} onClick={() => setTossChoice(c)}
                          className="h-12 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-400 transition-all">
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentary feed */}
                {commentary.length > 0 && (
                  <div className="space-y-2 text-left bg-slate-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Zap className="h-3 w-3 fill-current" /> AI Commentary
                    </p>
                    <AnimatePresence>
                      {commentary.slice(0, commentIdx + 1).map((line, i) => (
                        <motion.p key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className="text-xs font-bold text-[#0B1F3A] leading-relaxed">
                          {line}
                        </motion.p>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Start Match button — show when toss is complete, hide once commentary starts */}
              {tossResult && tossChoice && !isCreating && (
                <Button onClick={handleStartMatch}
                  className="w-full h-20 bg-[#0B1F3A] text-white font-black text-2xl rounded-[2rem] shadow-xl hover:bg-sky-500 transition-all">
                  START MATCH 🏸
                </Button>
              )}
              {isCreating && (
                <div className="w-full h-20 rounded-[2rem] bg-sky-500 flex items-center justify-center gap-3">
                  <Loader2 className="animate-spin h-6 w-6 text-white" />
                  <span className="font-black text-white uppercase tracking-widest text-sm">Starting match...</span>
                </div>
              )}
              {!tossResult && (
                <Button onClick={() => setPhase(1)} variant="outline"
                  className="w-full h-14 rounded-[2rem] font-black text-[10px] uppercase border-slate-200 gap-2">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default CreateIndividualMatch;
