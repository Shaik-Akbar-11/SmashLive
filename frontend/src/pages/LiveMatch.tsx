import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Play, Search, Zap, Radio, Loader2, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchAPI, TournamentAPI } from '@/services/api';
import { useSocketEvent } from '@/hooks/use-socket';

const LiveMatch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'scheduled'>('live');
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [live, scheduled, tourneys] = await Promise.all([
        MatchAPI.getAll('live'),
        MatchAPI.getAll('scheduled'),
        TournamentAPI.getAll(),
      ]);
      setLiveMatches(live.map((m: any) => ({ ...m, id: m._id || m.id })));
      setScheduledMatches(scheduled.map((m: any) => ({ ...m, id: m._id || m.id })));
      setLiveTournaments(tourneys.map((t: any) => ({ ...t, id: t._id || t.id })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useSocketEvent('feed:score_update', (payload) => {
    setLiveMatches(prev => prev.map(m =>
      (m._id || m.id) === payload.matchId
        ? { ...m, current_score: payload.current_score, serving: payload.serving, status: payload.status }
        : m
    ));
  });

  useSocketEvent('feed:match_created', (match) => {
    const normalized = { ...match, id: match._id || match.id };
    if (normalized.status === 'scheduled') {
      setScheduledMatches(prev =>
        prev.find(m => (m._id || m.id) === normalized.id) ? prev : [normalized, ...prev]
      );
    } else {
      setLiveMatches(prev =>
        prev.find(m => (m._id || m.id) === normalized.id) ? prev : [normalized, ...prev]
      );
    }
  });

  useSocketEvent('feed:match_started', (match) => {
    const id = match._id || match.id;
    setScheduledMatches(prev => prev.filter(m => (m._id || m.id) !== id));
    setLiveMatches(prev => {
      if (prev.find(m => (m._id || m.id) === id)) {
        return prev.map(m => (m._id || m.id) === id ? { ...m, status: 'live' } : m);
      }
      return [{ ...match, id }, ...prev];
    });
  });

  useSocketEvent('feed:match_completed', (match) => {
    setLiveMatches(prev => prev.filter(m => (m._id || m.id) !== String(match._id)));
  });

  const isEligible = (match: any): boolean => {
    if (!match.scheduledAt) return true;
    return new Date(match.scheduledAt) <= new Date();
  };

  const formatScheduled = (match: any): string => {
    if (!match.scheduledAt) return 'Time not set';
    return new Date(match.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const liveItems = useMemo(() => {
    const matches = liveMatches.map(m => ({
      id: m.id, type: 'match', title: m.name,
      p1: m.players?.p1?.name || m.players?.sideA?.[0]?.name || 'Player A',
      p2: m.players?.p2?.name || m.players?.sideB?.[0]?.name || 'Player B',
      score: m.current_score ? `${m.current_score[0]}-${m.current_score[1]}` : '0-0',
      path: `/broadcast/${m.id}`,
    }));
    const tourneys = liveTournaments.map(t => ({
      id: t._id || t.id, type: 'tournament', title: t.name, path: `/tournament/${t._id || t.id}`,
      p1: '', p2: '', score: '',
    }));
    const all = [...matches, ...tourneys];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(i => i.title?.toLowerCase().includes(q) || i.p1?.toLowerCase().includes(q) || i.p2?.toLowerCase().includes(q));
  }, [query, liveMatches, liveTournaments]);

  const filteredScheduled = useMemo(() => {
    if (!query) return scheduledMatches;
    const q = query.toLowerCase();
    return scheduledMatches.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      (m.players?.p1?.name || '').toLowerCase().includes(q) ||
      (m.players?.p2?.name || '').toLowerCase().includes(q) ||
      (m.players?.sideA?.[0]?.name || '').toLowerCase().includes(q)
    );
  }, [query, scheduledMatches]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <main className="px-4 py-8 space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-sky-500 fill-current" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Match Hub</span>
          </div>
          <h1 className="text-3xl font-black text-[#0B1F3A] uppercase italic">Matches</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input placeholder="Search Player or Match..." value={query} onChange={e => setQuery(e.target.value)}
            className="h-14 pl-12 bg-white border-slate-100 rounded-2xl font-bold focus:border-sky-500 shadow-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('live')}
            className={cn('flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
              activeTab === 'live' ? 'bg-[#0B1F3A] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100')}>
            <Radio className={cn('h-3 w-3', activeTab === 'live' ? 'text-red-400 animate-pulse' : 'text-slate-300')} />
            Live
            {liveMatches.length > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[8px]">{liveMatches.length}</span>}
          </button>
          <button onClick={() => setActiveTab('scheduled')}
            className={cn('flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
              activeTab === 'scheduled' ? 'bg-[#0B1F3A] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100')}>
            <Calendar className="h-3 w-3" />
            Scheduled
            {scheduledMatches.length > 0 && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[8px]', activeTab === 'scheduled' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500')}>
                {scheduledMatches.length}
              </span>
            )}
          </button>
        </div>
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 text-sky-500 animate-spin" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checking the court...</p>
          </div>
        ) : activeTab === 'live' ? (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {liveItems.length > 0 ? liveItems.map(item => (
                <motion.div layout key={item.id} onClick={() => navigate(item.path)} className="app-card p-6 flex flex-col gap-6 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <Badge className={cn('text-white border-none text-[9px] font-black uppercase px-3 h-6', item.type === 'match' ? 'bg-[#0B1F3A]' : 'bg-sky-500')}>
                      {item.type === 'match' ? 'Match' : 'Tournament'}
                    </Badge>
                    <Radio className="h-3 w-3 text-red-500 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{item.title}</p>
                      {item.type === 'match' ? (
                        <div className="font-black text-lg text-[#0B1F3A] uppercase italic leading-none">
                          {item.p1}<br /><span className="text-sky-500 opacity-20 text-xs">VS</span><br />{item.p2}
                        </div>
                      ) : (
                        <div className="font-black text-xl text-[#0B1F3A] uppercase italic leading-none">{item.title}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-4">
                      {item.type === 'match' && <span className="text-4xl font-black font-mono text-sky-600">{item.score}</span>}
                      <Button className="h-12 w-12 rounded-xl bg-[#0B1F3A] text-white border-none">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-white/50 border-slate-200">
                  <Activity className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No live matches right now</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredScheduled.length > 0 ? filteredScheduled.map(match => {
                const eligible = isEligible(match);
                const p1 = match.players?.p1?.name || match.players?.sideA?.[0]?.name || 'Side A';
                const p2 = match.players?.p2?.name || match.players?.sideB?.[0]?.name || 'Side B';
                return (
                  <motion.div layout key={match.id} className="app-card p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-sky-100 text-sky-700 border-none text-[9px] font-black uppercase px-3 h-6">Scheduled</Badge>
                      {eligible && <Badge className="bg-emerald-100 text-emerald-700 border-none text-[9px] font-black uppercase px-3 h-6">Ready</Badge>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{match.name}</p>
                      <p className="font-black text-lg text-[#0B1F3A] uppercase italic leading-tight">
                        {p1} <span className="text-slate-300 text-sm font-normal">vs</span> {p2}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-sky-400" />{formatScheduled(match)}</span>
                      {match.court && <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-sky-400" />Court {match.court}</span>}
                    </div>
                    <div className="pt-3 border-t border-slate-50 flex gap-3">
                      <Button onClick={() => navigate(`/scoring/${match.id}`)} variant="outline"
                        className="flex-1 h-11 rounded-xl font-black text-[10px] uppercase border-slate-200 bg-white">
                        View Match
                      </Button>
                      {eligible && (
                        <Button onClick={() => navigate(`/scoring/${match.id}`)}
                          className="flex-1 h-11 rounded-xl bg-[#0B1F3A] text-white font-black text-[10px] uppercase gap-2">
                          <Play className="h-4 w-4 fill-current" /> Start Match
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-white/50 border-slate-200">
                  <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No scheduled matches</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveMatch;
