import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy, Calendar, Users, MapPin,
  ChevronLeft, Activity, Globe, Loader2,
  Copy, Check, Download, Lock, Shuffle, Star,
  CheckCircle2, XCircle, Clock, RefreshCw
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { TournamentAPI } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ── Status badge colours ───────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  registration_open:   'bg-green-500',
  registration_closed: 'bg-amber-500',
  draw_generated:      'bg-sky-500',
  in_progress:         'bg-red-500',
  completed:           'bg-slate-400',
  draft:               'bg-slate-300',
};

const STATUS_LABELS: Record<string, string> = {
  registration_open:   'Registration Open',
  registration_closed: 'Registration Closed',
  draw_generated:      'Draw Generated',
  in_progress:         'In Progress',
  completed:           'Completed',
  draft:               'Draft',
};

// ── Round labels (knockout) ────────────────────────────────────────────────
function roundLabel(round: number, totalRounds: number): string {
  const diff = totalRounds - round;
  if (diff === 0) return 'Final';
  if (diff === 1) return 'Semi Final';
  if (diff === 2) return 'Quarter Final';
  return `Round ${round}`;
}

// ── Bracket view ───────────────────────────────────────────────────────────
const BracketView = ({
  bracket, participants, onResult, isCreator
}: {
  bracket: any[];
  participants: any[];
  onResult: (matchId: string, winnerId: string) => void;
  isCreator: boolean;
}) => {
  const pMap: Record<string, any> = {};
  participants.forEach(p => { pMap[String(p._id)] = p; });

  const rounds = [...new Set(bracket.map(m => m.round))].sort((a, b) => a - b);
  const maxRound = Math.max(...rounds);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max">
        {rounds.map(round => (
          <div key={round} className="flex flex-col gap-4 w-56">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">
              {roundLabel(round, maxRound)}
            </p>
            {bracket.filter(m => m.round === round).map((match: any) => {
              const pA = pMap[String(match.participantA)];
              const pB = pMap[String(match.participantB)];
              const winner = match.winner ? String(match.winner) : null;
              const isBye = match.status === 'bye';
              const isDone = match.status === 'completed' || isBye;

              return (
                <div key={String(match._id)} className={cn(
                  'bg-white border rounded-2xl overflow-hidden shadow-sm',
                  isDone ? 'border-slate-100 opacity-80' : 'border-sky-200'
                )}>
                  {/* Participant A */}
                  <div className={cn('px-4 py-2.5 flex items-center justify-between border-b border-slate-50',
                    winner === String(match.participantA) ? 'bg-sky-50' : '')}>
                    <span className={cn('text-xs font-black uppercase truncate max-w-[120px]',
                      winner === String(match.participantA) ? 'text-sky-600' : 'text-[#0B1F3A]')}>
                      {pA?.name || (isBye ? 'BYE' : 'TBD')}
                    </span>
                    {!isDone && pA && pB && isCreator && (
                      <button onClick={() => onResult(String(match._id), String(match.participantA))}
                        className="text-[8px] font-black bg-sky-500 text-white px-2 py-1 rounded-lg ml-2 hover:bg-sky-600 transition">
                        WIN
                      </button>
                    )}
                  </div>
                  {/* Participant B */}
                  <div className={cn('px-4 py-2.5 flex items-center justify-between',
                    winner === String(match.participantB) ? 'bg-sky-50' : '')}>
                    <span className={cn('text-xs font-black uppercase truncate max-w-[120px]',
                      winner === String(match.participantB) ? 'text-sky-600' : 'text-[#0B1F3A]')}>
                      {pB?.name || (isBye ? 'BYE' : 'TBD')}
                    </span>
                    {!isDone && pA && pB && isCreator && (
                      <button onClick={() => onResult(String(match._id), String(match.participantB))}
                        className="text-[8px] font-black bg-sky-500 text-white px-2 py-1 rounded-lg ml-2 hover:bg-sky-600 transition">
                        WIN
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

import BracketTree from '@/components/tournament/BracketTree';

// ── Standings view (Round Robin) ───────────────────────────────────────────
const StandingsView = ({ standings }: { standings: any[] }) => (
  <div className="space-y-2">
    <div className="grid grid-cols-6 gap-2 px-4 py-2">
      {['#', 'Player', 'P', 'W', 'L', 'Pts'].map(h => (
        <span key={h} className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">{h}</span>
      ))}
    </div>
    {standings.map((row: any, idx: number) => (
      <div key={idx} className={cn('grid grid-cols-6 gap-2 px-4 py-3 rounded-2xl items-center',
        idx === 0 ? 'bg-sky-50 border border-sky-100' : 'bg-white border border-slate-50')}>
        <span className={cn('text-sm font-black text-center', idx === 0 ? 'text-yellow-500' : 'text-slate-400')}>
          {idx === 0 ? '🥇' : `#${idx + 1}`}
        </span>
        <span className="text-xs font-black text-[#0B1F3A] uppercase col-span-1 truncate">{row.participant?.name || '—'}</span>
        <span className="text-xs font-black text-slate-500 text-center">{row.played}</span>
        <span className="text-xs font-black text-green-600 text-center">{row.wins}</span>
        <span className="text-xs font-black text-red-400 text-center">{row.losses}</span>
        <span className="text-sm font-black text-sky-600 text-center">{row.points}</span>
      </div>
    ))}
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────
const TournamentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament,    setTournament]    = useState<any>(null);
  const [participants,  setParticipants]  = useState<any[]>([]);
  const [bracket,       setBracket]       = useState<any[]>([]);
  const [standings,     setStandings]     = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState(false);
  const [notFound,      setNotFound]      = useState(false);
  const [activeTab,     setActiveTab]     = useState<'roster'|'bracket'|'standings'|'manage'>('roster');
  const [copied,        setCopied]        = useState(false);

  // Current logged-in user
  const currentUserId = (() => {
    try { return JSON.parse(localStorage.getItem('userProfile') || '{}')._id || ''; } catch { return ''; }
  })();

  const load = useCallback(async (attempt = 0) => {
    if (!id) return;
    if (attempt === 0) { setLoading(true); setNotFound(false); }
    try {
      const t = await TournamentAPI.getById(id);
      setTournament({ ...t, id: t._id || t.id });
      setLoading(false);

      TournamentAPI.getParticipants(id).then(setParticipants).catch(() => {});
      if (['draw_generated', 'in_progress', 'completed'].includes(t.status)) {
        TournamentAPI.getBracket(t._id || t.id).then(setBracket).catch(() => {});
      }
      if (t.format === 'round_robin' && ['in_progress', 'completed'].includes(t.status)) {
        TournamentAPI.getStandings(t._id || t.id).then(setStandings).catch(() => {});
      }
    } catch (e: any) {
      const msg = e.message?.toLowerCase() || '';
      if (msg.includes('not found') || msg.includes('404')) {
        setNotFound(true);
        setLoading(false);
      } else if (attempt < 8) {
        // Retry with short 2s delay — 8 retries × 8s timeout ≈ 80s max total
        setTimeout(() => load(attempt + 1), 2000);
      }
      // After 8 retries — keep spinner, user can use browser back
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleGenerateDraw = async () => {
    if (!tournament) return;
    try {
      await TournamentAPI.generateDraw(tournament.id);
      showSuccess('Draw generated!');
      load();
      setActiveTab('bracket');
    } catch (e: any) { showError(e.message); }
  };

  const handleCloseReg = async () => {
    if (!tournament) return;
    try {
      await TournamentAPI.closeRegistration(tournament.id);
      showSuccess('Registration closed');
      load();
    } catch (e: any) { showError(e.message); }
  };

  const handleResult = async (bracketMatchId: string, winnerId: string) => {
    if (!tournament) return;
    try {
      await TournamentAPI.recordResult(tournament.id, bracketMatchId, winnerId);
      showSuccess('Result recorded!');
      load();
    } catch (e: any) { showError(e.message); }
  };

  const handleBye = async (bracketMatchId: string) => {
    if (!tournament) return;
    try {
      await TournamentAPI.byeMatch(tournament.id, bracketMatchId);
      showSuccess('Bye given — opponent advances');
      load();
    } catch (e: any) { showError(e.message); }
  };

  // Find the current user's participant entry in this tournament
  const myParticipant = participants.find(p =>
    (p.user_id && String(p.user_id) === currentUserId) ||
    (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}').name?.toLowerCase() === p.name?.toLowerCase(); } catch { return false; } })()
  );

  const handleApprove = async (participantId: string) => {
    try {
      await TournamentAPI.approveParticipant(tournament.id, participantId);
      showSuccess('Participant accepted');
      TournamentAPI.getParticipants(tournament.id).then(setParticipants).catch(() => {});
    } catch (e: any) { showError(e.message); }
  };

  const handleReject = async (participantId: string) => {
    try {
      await TournamentAPI.rejectParticipant(tournament.id, participantId);
      showSuccess('Participant rejected');
      TournamentAPI.getParticipants(tournament.id).then(setParticipants).catch(() => {});
    } catch (e: any) { showError(e.message); }
  };

  const regLink = tournament ? `${window.location.origin}/register/${tournament.slug}` : '';
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(regLink)}`;

  const downloadQR = async () => {
    try {
      const res  = await fetch(qrUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `QR_${tournament.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showSuccess('QR Downloaded!');
    } catch { showError('Download failed'); }
  };

  if (loading || !tournament) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-10 w-10 text-sky-500 animate-spin" /></div>;

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <Trophy className="h-16 w-16 text-slate-200" />
      <Button onClick={() => navigate('/tournaments')} className="bg-[#0B1F3A] text-white px-10 h-14 rounded-2xl font-black uppercase text-[10px]">
        Back to Tournaments
      </Button>
    </div>
  );

  const isKnockout = tournament.format === 'knockout';
  const isRR       = tournament.format === 'round_robin';
  // Creator: must have matching creatorId OR no creatorId (legacy) AND be logged in
  const isCreator  = !!currentUserId && (
    !tournament.creatorId || String(tournament.creatorId) === String(currentUserId)
  );
  const canClose   = isCreator && tournament.status === 'registration_open';
  const canDraw    = isCreator && ['registration_open', 'registration_closed'].includes(tournament.status);
  const hasBracket = bracket.length > 0;
  const winnerP    = participants.find(p => String(p._id) === String(tournament.winner));

  const pendingPs  = participants.filter(p => p.status === 'pending');
  const acceptedPs = participants.filter(p => ['accepted', 'registered', 'confirmed'].includes(p.status));
  const rejectedPs = participants.filter(p => p.status === 'rejected');

  // Deadline helpers
  const deadlinePassed = tournament.reg_deadline &&
    new Date() > new Date(tournament.reg_deadline + 'T23:59:59');
  const deadlineLabel = tournament.reg_deadline
    ? new Date(tournament.reg_deadline + 'T12:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : null;

  const tabs = [
    { id: 'roster',    label: 'Roster',   show: true },
    { id: 'bracket',   label: isRR ? 'Fixtures' : 'Bracket', show: hasBracket },
    { id: 'standings', label: 'Standings', show: isRR && standings.length > 0 },
    { id: 'manage',    label: `Manage${pendingPs.length > 0 ? ` (${pendingPs.length})` : ''}`, show: isCreator },
  ].filter(t => t.show);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1F3A] pb-32">
      <Navbar />
      <main className="container px-4 py-8 space-y-8 max-w-4xl mx-auto">

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/tournaments')} className="p-2 -ml-2 text-slate-400 hover:text-[#0B1F3A]">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tournament Detail</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge className={cn('text-white border-none font-black px-4 h-6 text-[8px] uppercase rounded-full', STATUS_COLORS[tournament.status] || 'bg-slate-400')}>
                {STATUS_LABELS[tournament.status] || tournament.status}
              </Badge>
              <Badge variant="outline" className="font-black text-[8px] uppercase px-3 h-6">
                {tournament.format === 'round_robin' ? 'Round Robin' : 'Knockout'} · {tournament.category}
              </Badge>
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase italic leading-none">{tournament.name}</h1>
            <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 font-black uppercase tracking-widest">
              {tournament.city      && <span className="flex items-center gap-1.5"><MapPin     className="h-3.5 w-3.5 text-sky-500" /> {tournament.city}</span>}
              {tournament.start_date && <span className="flex items-center gap-1.5"><Calendar   className="h-3.5 w-3.5 text-sky-500" /> {tournament.start_date}</span>}
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-sky-500" /> {participants.length} / {tournament.max_participants}</span>
              {deadlineLabel && (
                <span className={cn('flex items-center gap-1.5', deadlinePassed ? 'text-red-400' : 'text-amber-500')}>
                  <Calendar className="h-3.5 w-3.5" />
                  Reg. Deadline: {deadlineLabel}{deadlinePassed ? ' (Closed)' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Winner banner */}
          {tournament.status === 'completed' && winnerP && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-5 flex items-center gap-4">
              <Trophy className="h-8 w-8 text-yellow-500 shrink-0" />
              <div>
                <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Tournament Winner</p>
                <p className="text-xl font-black text-[#0B1F3A] uppercase italic">{winnerP.name}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            {canClose && (
              <Button onClick={handleCloseReg} variant="outline" className="h-11 rounded-xl font-black text-[10px] uppercase gap-2 border-amber-200 text-amber-600 hover:bg-amber-50">
                <Lock className="h-4 w-4" /> Close Registration
              </Button>
            )}
            {canDraw && participants.length >= 2 && (
              <Button onClick={handleGenerateDraw} className="h-11 rounded-xl bg-[#0B1F3A] text-white font-black text-[10px] uppercase gap-2 shadow-lg hover:bg-sky-500 transition">
                <Shuffle className="h-4 w-4" /> Generate Draw
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">

            {/* Tabs */}
            {tabs.length > 1 && (
              <div className="flex gap-2">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={cn('px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                      activeTab === tab.id ? 'bg-[#0B1F3A] text-white' : 'bg-white text-slate-400 border border-slate-100')}>
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Roster */}
            {activeTab === 'roster' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h3 className="text-sm font-black uppercase italic">Entry Roster</h3>
                  <Activity className="h-4 w-4 text-sky-500" />
                </div>
                {acceptedPs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {acceptedPs.map((p: any) => (
                      <div key={String(p._id)} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#0B1F3A] flex items-center justify-center text-sky-400 font-black text-[10px] uppercase shrink-0">
                          {p.name[0]}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="font-black text-[#0B1F3A] uppercase text-xs truncate">{p.name}</p>
                          {p.partner_name && <p className="text-[9px] font-bold text-sky-500 truncate">+ {p.partner_name}</p>}
                          <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{p.smash_id || 'Registered'}</p>
                        </div>
                        {p.status === 'winner' && <Star className="h-4 w-4 text-yellow-500 shrink-0" />}
                        {p.status === 'eliminated' && <span className="text-[8px] font-black text-red-400 uppercase">Out</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-40">
                    <Users className="h-10 w-10 mx-auto text-slate-200 mb-3" />
                    <p className="font-black text-slate-400 uppercase text-[9px]">No confirmed entries yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Bracket */}
            {activeTab === 'bracket' && hasBracket && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h3 className="text-sm font-black uppercase italic">
                    {isKnockout ? 'Knockout Bracket' : 'Round Robin Fixtures'}
                  </h3>
                  <Trophy className="h-4 w-4 text-sky-500" />
                </div>
                <BracketTree
                  bracket={bracket}
                  onResult={isCreator ? handleResult : undefined}
                  onBye={handleBye}
                  currentParticipantId={myParticipant ? String(myParticipant._id) : undefined}
                />
              </div>
            )}

            {/* Standings */}
            {activeTab === 'standings' && standings.length > 0 && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h3 className="text-sm font-black uppercase italic">Standings</h3>
                  <Activity className="h-4 w-4 text-sky-500" />
                </div>
                <StandingsView standings={standings} />
              </div>
            )}

            {/* Manage — creator only */}
            {activeTab === 'manage' && isCreator && (
              <div className="space-y-6">
                {/* Pending */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-black uppercase italic">Pending Applications</h3>
                    {pendingPs.length > 0 && (
                      <span className="ml-auto bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">{pendingPs.length}</span>
                    )}
                  </div>
                  {pendingPs.length > 0 ? pendingPs.map(p => (
                    <div key={String(p._id)} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-100">
                      <div className="h-9 w-9 rounded-full bg-[#0B1F3A] flex items-center justify-center text-sky-400 font-black text-[10px] uppercase shrink-0">{p.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#0B1F3A] uppercase text-xs truncate">{p.name}</p>
                        {p.partner_name && <p className="text-[9px] text-sky-500 truncate">+ {p.partner_name}</p>}
                        <p className="text-[8px] text-slate-400 uppercase">{p.smash_id || '—'} · {p.state || '—'}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleApprove(String(p._id))}
                          className="h-8 px-3 bg-green-500 text-white rounded-xl text-[8px] font-black uppercase hover:bg-green-600 transition flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Accept
                        </button>
                        <button onClick={() => handleReject(String(p._id))}
                          className="h-8 px-3 bg-red-400 text-white rounded-xl text-[8px] font-black uppercase hover:bg-red-500 transition flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[9px] font-black text-slate-400 uppercase italic py-4 text-center">No pending applications</p>
                  )}
                </div>

                {/* Accepted */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <h3 className="text-sm font-black uppercase italic">Accepted Participants</h3>
                    <span className="ml-auto bg-green-100 text-green-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">{acceptedPs.length}</span>
                  </div>
                  {acceptedPs.length > 0 ? acceptedPs.map(p => (
                    <div key={String(p._id)} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="h-9 w-9 rounded-full bg-green-500 flex items-center justify-center text-white font-black text-[10px] uppercase shrink-0">{p.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[#0B1F3A] uppercase text-xs truncate">{p.name}</p>
                        {p.partner_name && <p className="text-[9px] text-sky-500 truncate">+ {p.partner_name}</p>}
                        <p className="text-[8px] text-slate-400 uppercase">{p.smash_id || '—'}</p>
                      </div>
                      <Star className="h-4 w-4 text-green-400 shrink-0" />
                    </div>
                  )) : (
                    <p className="text-[9px] font-black text-slate-400 uppercase italic py-4 text-center">No accepted participants yet</p>
                  )}
                </div>

                {/* Rejected */}
                {rejectedPs.length > 0 && (
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <h3 className="text-sm font-black uppercase italic">Rejected Applications</h3>
                    </div>
                    {rejectedPs.map(p => (
                      <div key={String(p._id)} className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-100 opacity-70">
                        <div className="h-9 w-9 rounded-full bg-red-200 flex items-center justify-center text-red-500 font-black text-[10px] uppercase shrink-0">{p.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-500 uppercase text-xs truncate">{p.name}</p>
                          <p className="text-[8px] text-slate-400 uppercase">{p.smash_id || '—'}</p>
                        </div>
                        <XCircle className="h-4 w-4 text-red-300 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar — QR / registration */}
          <div className="lg:col-span-4 space-y-6">
            {tournament.status === 'registration_open' && (
              <div className="bg-[#0B1F3A] p-8 rounded-[2.5rem] text-white space-y-5 shadow-xl">
                <Trophy className="h-8 w-8 text-sky-400" />
                <div className="bg-white p-3 rounded-2xl shadow-inner inline-block relative">
                  <img src={qrUrl} alt="QR" className="w-full aspect-square rounded-lg" />
                  <Button onClick={downloadQR} className="absolute -bottom-2 -right-2 h-10 w-10 bg-sky-500 text-white rounded-xl shadow-lg border-none p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] text-white/50 font-bold uppercase tracking-widest">Athlete Entry Link</p>
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 bg-white/10 rounded-xl px-3 flex items-center overflow-hidden">
                      <span className="text-[9px] font-mono text-white/60 truncate">{regLink}</span>
                    </div>
                    <Button onClick={() => { navigator.clipboard.writeText(regLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="h-10 w-10 bg-sky-500 text-white rounded-xl shrink-0 border-none p-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tournament info card */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Tournament Info</h4>
              {[
                { label: 'Format',    val: tournament.format === 'round_robin' ? 'Round Robin' : 'Knockout' },
                { label: 'Category',  val: tournament.category },
                { label: 'Organizer', val: tournament.organizer || '—' },
                { label: 'Reg. Deadline', val: deadlineLabel || '—' },
                { label: 'Max Entry', val: tournament.max_participants },
                { label: 'Entries',   val: participants.length },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{label}</span>
                  <span className="text-xs font-black text-[#0B1F3A] uppercase">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TournamentDetail;
