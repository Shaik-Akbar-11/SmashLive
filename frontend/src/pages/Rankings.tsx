import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Search, Loader2, Trophy, Zap, ChevronRight, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAPI } from '@/services/api';
import { cn } from '@/lib/utils';
import { useSocketEvent } from '@/hooks/use-socket';
import { PlayerCardSkeleton } from '@/components/ui/skeleton-cards';
import { INDIAN_STATES, STATE_DISTRICTS } from '@/data/locations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Rankings = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope]             = useState<'world' | 'state' | 'district'>('world');
  const [stateFilter, setStateFilter]   = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [athletes, setAthletes]         = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  const fetchRankings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await UserAPI.getRankings(
        scope === 'world' ? 'world' : 'state',
        stateFilter || undefined,
        districtFilter || undefined
      );
      setAthletes(data);
    } catch {
      setAthletes([]);
    } finally {
      setIsLoading(false);
    }
  }, [scope, stateFilter, districtFilter]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);
  useSocketEvent('feed:match_completed', () => { fetchRankings(); });

  const filtered = athletes.filter(p =>
    !searchQuery ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.smashId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />
      <main className="container px-4 py-8 space-y-6">

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-sky-500" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">Live Rankings</span>
          </div>
          <h1 className="text-4xl font-black text-[#0B1F3A] tracking-tighter italic uppercase leading-none">Rankings</h1>

          {/* Scope tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['world', 'state', 'district'] as const).map(s => (
              <button key={s} onClick={() => { setScope(s); setDistrictFilter(''); }}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
                  scope === s ? 'bg-[#0B1F3A] text-white' : 'bg-white text-slate-400 border border-slate-100'
                )}>
                {s === 'world' ? 'National' : s === 'state' ? 'State' : 'District'}
              </button>
            ))}
          </div>

          {/* State selector */}
          {(scope === 'state' || scope === 'district') && (
            <Select value={stateFilter} onValueChange={v => { setStateFilter(v); setDistrictFilter(''); }}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-100 font-bold text-sm">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {/* District selector */}
          {scope === 'district' && stateFilter && (
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-100 font-bold text-sm">
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {(STATE_DISTRICTS[stateFilter] || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input placeholder="Search players..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl font-bold text-xs shadow-sm outline-none focus:border-sky-500 transition-all" />
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <PlayerCardSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
              <Zap className="h-10 w-10 text-slate-200 mx-auto mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                {athletes.length === 0 ? 'No ranked players yet' : 'No players found'}
              </p>
            </div>
          ) : filtered.map((row, idx) => (
            <div key={row._id || idx} onClick={() => navigate(`/player/${row._id}`)}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer group">
              <div className={cn('h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-xs',
                idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-300 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-50 text-slate-400')}>
                #{row.rank || idx + 1}
              </div>
              <div className="h-10 w-10 shrink-0 rounded-full bg-[#0B1F3A] flex items-center justify-center text-[10px] font-black text-sky-400 uppercase group-hover:bg-sky-500 group-hover:text-white transition-colors">
                {row.name?.[0] || '?'}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <p className="font-black text-[#0B1F3A] uppercase italic text-sm leading-tight truncate group-hover:text-sky-600">{row.name}</p>
                  {(row.currentStreak || 0) >= 3 && (
                    <span className="flex items-center gap-0.5 text-[8px] font-black text-orange-500">
                      <Flame className="h-3 w-3" />{row.currentStreak}
                    </span>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
                  {row.smashId || '—'} · {row.district ? `${row.district}, ` : ''}{row.state || 'India'}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[8px] font-black text-green-600">{row.matchesWon}W</span>
                  <span className="text-[8px] font-black text-red-400">{row.matchesLost}L</span>
                  {row.matchesPlayed > 0 && <span className="text-[8px] font-black text-sky-500">{row.winRate}%</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-[#0B1F3A] leading-none">{row.rankingPoints}</p>
                <p className="text-[8px] font-black text-slate-300 uppercase">pts</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-sky-500 transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Rankings;

const Rankings = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery]   = useState('');
  const [scope, setScope]               = useState<'world' | 'state'>('world');
  const [stateFilter, setStateFilter]   = useState('');
  const [athletes, setAthletes]         = useState<any[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  const fetchRankings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await UserAPI.getRankings(scope, scope === 'state' ? stateFilter : undefined);
      setAthletes(data);
    } catch {
      setAthletes([]);
    } finally {
      setIsLoading(false);
    }
  }, [scope, stateFilter]);

  useEffect(() => { fetchRankings(); }, [fetchRankings]);

  // Real-time: refresh when a match completes
  useSocketEvent('feed:match_completed', () => { fetchRankings(); });

  const filtered = athletes.filter(p =>
    !searchQuery ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.smashId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />
      <main className="container px-4 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-sky-500" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">Live Rankings</span>
          </div>
          <h1 className="text-4xl font-black text-[#0B1F3A] tracking-tighter italic uppercase leading-none">
            Player Rankings
          </h1>

          {/* Scope tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {(['world', 'state'] as const).map(s => (
              <button key={s} onClick={() => setScope(s)}
                className={cn(
                  'px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm',
                  scope === s ? 'bg-[#0B1F3A] text-white' : 'bg-white text-slate-400 border border-slate-100'
                )}>
                {s === 'world' ? 'National' : 'State'}
              </button>
            ))}
          </div>

          {/* State selector */}
          {scope === 'state' && (
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-100 font-bold text-sm">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-60">
                {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            placeholder="Search players..."
            className="w-full h-14 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl font-bold text-xs shadow-sm outline-none focus:border-sky-500 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <PlayerCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
              <Zap className="h-10 w-10 text-slate-200 mx-auto mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                {athletes.length === 0 ? 'No ranked players yet — complete competitive matches to appear here' : 'No players found'}
              </p>
            </div>
          ) : (
            filtered.map((row, idx) => {
              const isTop3 = idx < 3;
              const streak = row.currentStreak || 0;
              return (
                <div key={row._id || idx}
                  onClick={() => navigate(`/player/${row._id || row.mobile}`)}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer group">

                  {/* Rank badge */}
                  <div className={cn(
                    'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-xs',
                    idx === 0 ? 'bg-amber-500 text-white' :
                    idx === 1 ? 'bg-slate-300 text-white' :
                    idx === 2 ? 'bg-orange-400 text-white' :
                    'bg-slate-50 text-slate-400'
                  )}>
                    #{row.rank || idx + 1}
                  </div>

                  {/* Avatar */}
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#0B1F3A] flex items-center justify-center text-[10px] font-black text-sky-400 uppercase group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    {row.name?.[0] || '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-[#0B1F3A] uppercase italic text-sm leading-tight truncate group-hover:text-sky-600 transition-colors">
                        {row.name}
                      </p>
                      {streak >= 3 && (
                        <span className="flex items-center gap-0.5 text-[8px] font-black text-orange-500 uppercase">
                          <Flame className="h-3 w-3" />{streak}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
                      {row.smashId || '—'} · {row.state || 'India'}
                    </p>
                    {/* Mini stats */}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[8px] font-black text-green-600">{row.matchesWon}W</span>
                      <span className="text-[8px] font-black text-red-400">{row.matchesLost}L</span>
                      {row.matchesPlayed > 0 && (
                        <span className="text-[8px] font-black text-sky-500">{row.winRate}%</span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-[#0B1F3A] leading-none">{row.rankingPoints}</p>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">pts</p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-sky-500 transition-colors shrink-0" />
                </div>
              );
            })
          )}
        </div>

        {athletes.length === 0 && !isLoading && (
          <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
            Rankings update automatically after competitive matches complete
          </p>
        )}
      </main>
    </div>
  );
};

export default Rankings;
