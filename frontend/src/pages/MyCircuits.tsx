import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import {
  Calendar, Trophy, Activity, Zap,
  ChevronRight, MapPin, Clock, Loader2,
  AlertCircle, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { MatchAPI, TournamentAPI, UserAPI } from '@/services/api';
import { cn } from '@/lib/utils';
import { useSocketEvent } from '@/hooks/use-socket';

const MyCircuits = () => {
  const navigate = useNavigate();
  const [loading,              setLoading]              = useState(true);
  const [liveMatches,          setLiveMatches]          = useState<any[]>([]);
  const [scheduledMatches,     setScheduledMatches]     = useState<any[]>([]);
  const [completedMatches,     setCompletedMatches]     = useState<any[]>([]);
  const [myTournaments,        setMyTournaments]        = useState<any[]>([]);

  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const myId    = profile._id || profile.id;
  const myName  = (profile.name || '').toLowerCase();
  const mobile  = profile.mobile || '';

  const matchesMe = (m: any) => {
    const str = JSON.stringify(m.players || '').toLowerCase();
    return str.includes(mobile) || (myName && str.includes(myName));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allMatches, allLive, allScheduled] = await Promise.all([
        MatchAPI.getAll(),
        MatchAPI.getAll('live'),
        MatchAPI.getAll('scheduled'),
      ]);

      setLiveMatches(allLive.filter(matchesMe).map(m => ({ ...m, id: m._id || m.id })));
      setScheduledMatches(allScheduled.filter(matchesMe).map(m => ({ ...m, id: m._id || m.id })));
      setCompletedMatches(
        allMatches
          .filter(m => m.status === 'completed' && matchesMe(m))
          .slice(0, 10)
          .map(m => ({ ...m, id: m._id || m.id }))
      );

      // Tournaments: fetch stats which includes participations
      if (myId) {
        try {
          const stats = await UserAPI.getStats(myId);
          setMyTournaments(stats.tournaments || []);
        } catch {
          setMyTournaments([]);
        }
      }
    } catch {
      setLiveMatches([]);
      setCompletedMatches([]);
    } finally {
      setLoading(false);
    }
  }, [myId, mobile, myName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time: refresh when match score updates
  useSocketEvent('feed:score_update', (payload) => {
    setLiveMatches(prev => prev.map(m =>
      (m._id || m.id) === payload.matchId
        ? { ...m, current_score: payload.current_score, status: payload.status }
        : m
    ));
  });

  useSocketEvent('feed:match_completed', () => { fetchData(); });
  useSocketEvent('feed:match_created',   () => { fetchData(); });

  const getScore = (m: any) => m.current_score ? `${m.current_score[0]}-${m.current_score[1]}` : '0-0';
  const getP1    = (m: any) => m.players?.p1?.name || m.players?.sideA?.[0]?.name || 'Side A';
  const getP2    = (m: any) => m.players?.p2?.name || m.players?.sideB?.[0]?.name || 'Side B';

  const getMatchResult = (m: any) => {
    const isSideA = JSON.stringify(m.players?.p1 || m.players?.sideA || '').toLowerCase().includes(mobile)
      || JSON.stringify(m.players?.p1 || m.players?.sideA || '').toLowerCase().includes(myName);
    const won = m.winner === (isSideA ? 1 : 2);
    return won ? 'W' : 'L';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />
      <main className="px-4 py-8 space-y-8 max-w-lg mx-auto">

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-500" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">My Activity</span>
          </div>
          <h1 className="text-4xl font-black text-[#0B1F3A] tracking-tighter uppercase italic leading-none">My Circuits</h1>
          {profile.name && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {profile.smashId || profile.smash_id || ''} · {profile.state || ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 text-sky-500 animate-spin" /></div>
        ) : (
          <div className="space-y-8">

            {/* Scheduled matches */}
            {scheduledMatches.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Scheduled
                </h2>
                {scheduledMatches.map(m => {
                  const eligible = !m.scheduledAt || new Date(m.scheduledAt) <= new Date();
                  const timeStr = m.scheduledAt
                    ? new Date(m.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Anytime';
                  return (
                    <div key={m.id} className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[#0B1F3A] uppercase text-xs truncate">{m.name || 'Match'}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{getP1(m)} vs {getP2(m)}</p>
                          <p className="text-[9px] font-bold text-amber-500 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />{timeStr}
                          </p>
                        </div>
                        {eligible
                          ? <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase shrink-0">Ready</Badge>
                          : <Badge className="bg-amber-100 text-amber-600 border-none text-[8px] font-black uppercase shrink-0">Waiting</Badge>
                        }
                      </div>
                      <Button
                        onClick={() => navigate('/live-match/active')}
                        className={cn(
                          'w-full h-10 rounded-xl font-black text-[10px] uppercase gap-2',
                          eligible ? 'bg-[#0B1F3A] text-white hover:bg-sky-500' : 'bg-slate-100 text-slate-400'
                        )}>
                        {eligible ? '▶ Start Match — Go to Live tab' : `⏳ Opens at ${timeStr}`}
                      </Button>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Live matches */}
            <section className="space-y-3">
              <h2 className="text-[10px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" /> Live Now
              </h2>
              {liveMatches.length > 0 ? liveMatches.map(m => (
                <div key={m.id} onClick={() => navigate(`/broadcast/${m.id}`)}
                  className="bg-white border border-sky-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm cursor-pointer hover:border-sky-400 transition-all">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#0B1F3A] uppercase text-sm truncate">{m.name || 'Live Match'}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{getP1(m)} vs {getP2(m)}</p>
                  </div>
                  <span className="font-black text-xl font-mono text-sky-600 shrink-0">{getScore(m)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                </div>
              )) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic">No live matches right now</p>
                </div>
              )}
            </section>

            {/* Recent match history */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <History className="h-3.5 w-3.5" /> Recent Matches
                </h2>
                <button onClick={() => navigate('/smashed')} className="text-[9px] font-black text-sky-500 uppercase tracking-widest">
                  All <ChevronRight className="inline h-3 w-3" />
                </button>
              </div>
              {completedMatches.length > 0 ? completedMatches.map(m => {
                const result = getMatchResult(m);
                return (
                  <div key={m.id} onClick={() => navigate(`/match/${m.id}`)}
                    className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:border-slate-200 transition-all">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0',
                      result === 'W' ? 'bg-green-500' : 'bg-red-400')}>
                      {result}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#0B1F3A] uppercase text-xs truncate">{m.name || 'Match'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{getP1(m)} vs {getP2(m)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-xs text-slate-600">{getScore(m)}</p>
                      <p className="text-[8px] font-black text-slate-300 uppercase">{m.match_type}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic">No completed matches yet</p>
                </div>
              )}
            </section>

            {/* My tournaments */}
            <section className="space-y-3">
              <h2 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5" /> My Tournaments
              </h2>
              {myTournaments.length > 0 ? myTournaments.map((t, i) => (
                <div key={t._id || i} onClick={() => t._id && navigate(`/tournament/${t._id}`)}
                  className={cn('bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all',
                    t._id ? 'cursor-pointer hover:border-amber-200' : '')}>
                  <div className="h-10 w-10 rounded-xl bg-[#0B1F3A] flex items-center justify-center text-sky-400 shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#0B1F3A] uppercase text-xs truncate">{t.name}</p>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                      {t.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-sky-500" />{t.city}</span>}
                      {t.date && <span>{t.date}</span>}
                    </div>
                  </div>
                  <Badge className={cn('text-white border-none text-[8px] font-black uppercase shrink-0',
                    t.result === 'winner' ? 'bg-yellow-500' :
                    t.result === 'eliminated' ? 'bg-red-400' : 'bg-sky-500')}>
                    {t.result || 'registered'}
                  </Badge>
                </div>
              )) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <AlertCircle className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-400 uppercase italic">No tournament registrations</p>
                  <Button onClick={() => navigate('/tournaments')} variant="ghost" className="mt-1 text-sky-500 font-black text-[9px] uppercase hover:bg-transparent">
                    Find Tournaments
                  </Button>
                </div>
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  );
};

export default MyCircuits;
