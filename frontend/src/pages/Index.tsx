import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import {
  ArrowRight, Activity, Trophy, Users,
  Zap, TrendingUp, Monitor, Radio, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MatchAPI, AnalyticsAPI } from '@/services/api';
import { useSocketEvent } from '@/hooks/use-socket';

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats]           = useState({ athletes: 0, tourneys: 0 });
  const [liveMatches, setLiveMatches] = useState<any[]>([]);

  const fetchLive = async () => {
    try {
      const matches = await MatchAPI.getAll('live');
      setLiveMatches(matches.slice(0, 3));
    } catch {
      setLiveMatches([]);
    }
  };

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    // Platform stats
    AnalyticsAPI.getStats()
      .then(s => setStats({ athletes: s.athletes, tourneys: s.tourneys }))
      .catch(() => {});
    fetchLive();
  }, []);

  // Real-time live feed updates
  useSocketEvent('feed:match_created',   () => fetchLive());
  useSocketEvent('feed:match_completed', () => fetchLive());
  useSocketEvent('feed:score_update',    (payload) => {
    setLiveMatches(prev => prev.map(m =>
      String(m._id) === String(payload.matchId || payload._id)
        ? { ...m, ...payload }
        : m
    ));
  });

  const featureGroups = [
    { category: 'Live Scores', icon: Activity,  color: 'text-sky-500',     bg: 'bg-sky-50' },
    { category: 'Broadcast',   icon: Monitor,   color: 'text-indigo-500',  bg: 'bg-indigo-50' },
    { category: 'Tournaments', icon: Trophy,    color: 'text-amber-500',   bg: 'bg-amber-50' },
    { category: 'Rankings',    icon: Users,     color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden pb-20">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-[#F8FAFC] px-6 py-12 space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
          <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#0B1F3A]">Platform Live</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-black text-[#0B1F3A] leading-[0.95] tracking-tighter uppercase italic">
            SMASH <br /><span className="text-sky-500">LIVE</span>
          </h1>
          <div className="h-1 w-16 bg-sky-500 rounded-full" />
        </div>

        <p className="text-base text-slate-500 font-medium leading-relaxed max-w-xs">
          The professional badminton network built for{' '}
          <span className="text-[#0B1F3A] font-black">real-time scores</span> and rankings.
        </p>

        <div className="flex flex-col gap-3">
          <Link to={isLoggedIn ? '/dashboard' : '/login'} className="w-full">
            <Button size="lg" className="w-full h-14 bg-[#0B1F3A] text-white rounded-xl font-black text-sm hover:bg-sky-600 shadow-xl border-none uppercase tracking-widest">
              ENTER THE COURT <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/live-match/active" className="w-full">
            <Button size="lg" variant="outline" className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest border-slate-200 gap-2">
              <Radio className="h-4 w-4 text-red-500 animate-pulse" /> Watch Live Matches
            </Button>
          </Link>
        </div>

        {/* Platform stats */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-500" />
              <h4 className="text-[10px] font-black text-[#0B1F3A] uppercase tracking-widest">Live Pulse</h4>
            </div>
            <Badge className="bg-red-500 text-white animate-pulse border-none h-6 px-3 text-[8px] font-black rounded-full uppercase">Online</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Players</p>
              <p className="text-2xl font-black text-[#0B1F3A]">{stats.athletes || '—'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Circuits</p>
              <p className="text-2xl font-black text-[#0B1F3A]">{stats.tourneys || '—'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Live Now</p>
              <p className="text-2xl font-black text-red-500">{liveMatches.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Matches Feed */}
      <section className="px-6 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#0B1F3A] uppercase italic flex items-center gap-2">
            <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            Live Now
          </h2>
          <Link to="/live-match/active" className="text-[10px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {liveMatches.length > 0 ? (
          <div className="space-y-3">
            {liveMatches.map((match: any) => {
              const p1 = match.players?.p1?.name || match.players?.sideA?.[0]?.name || 'Side A';
              const p2 = match.players?.p2?.name || match.players?.sideB?.[0]?.name || 'Side B';
              const score = match.current_score || [0, 0];
              return (
                <motion.div
                  key={match._id}
                  layoutId={match._id}
                  onClick={() => navigate(`/broadcast/${match._id}`)}
                  className="app-card p-4 flex items-center justify-between gap-4 cursor-pointer active-press group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
                        {match.name || 'Friendly Match'}
                      </p>
                      {(match.toss?.city || match.toss?.venue || match.city) && (
                        <span className="text-[8px] font-bold text-slate-300 truncate">
                          · {match.toss?.city || match.toss?.venue || match.city}
                        </span>
                      )}
                    </div>
                    <p className="font-black text-[#0B1F3A] uppercase italic text-sm truncate">{p1}</p>
                    <p className="font-black text-[#0B1F3A] uppercase italic text-sm truncate">{p2}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black font-mono text-sky-600">{score[0]}–{score[1]}</p>
                    <Badge className="bg-red-500 text-white border-none text-[7px] font-black uppercase mt-1">Live</Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-3xl">
            <Radio className="h-6 w-6 text-slate-200 mx-auto mb-2" />
            <p className="text-[9px] font-black text-slate-400 uppercase italic">No live matches right now</p>
            <Link to="/live-match/create" className="text-[9px] font-black text-sky-500 uppercase mt-1 block">
              Start one →
            </Link>
          </div>
        )}
      </section>

      {/* Feature grid */}
      <section className="py-8 px-6 space-y-4">
        <h2 className="text-sm font-black text-[#0B1F3A] uppercase italic">What's Inside</h2>
        <div className="grid grid-cols-2 gap-4">
          {featureGroups.map((group, i) => (
            <div key={i} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', group.bg, group.color)}>
                <group.icon className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-black text-[#0B1F3A] uppercase italic">{group.category}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="px-6 pb-8 grid grid-cols-2 gap-3">
        <Link to="/players">
          <div className="app-card p-4 text-center active-press">
            <Users className="h-5 w-5 text-sky-500 mx-auto mb-2" />
            <p className="text-[10px] font-black text-[#0B1F3A] uppercase">Players</p>
          </div>
        </Link>
        <Link to="/broadcast/center">
          <div className="app-card p-4 text-center active-press">
            <Monitor className="h-5 w-5 text-indigo-500 mx-auto mb-2" />
            <p className="text-[10px] font-black text-[#0B1F3A] uppercase">Broadcast</p>
          </div>
        </Link>
        <Link to="/tournaments">
          <div className="app-card p-4 text-center active-press">
            <Trophy className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
            <p className="text-[10px] font-black text-[#0B1F3A] uppercase">Circuits</p>
          </div>
        </Link>
        <Link to="/live-match/active">
          <div className="app-card p-4 text-center active-press">
            <Radio className="h-5 w-5 text-red-500 mx-auto mb-2" />
            <p className="text-[10px] font-black text-[#0B1F3A] uppercase">Live</p>
          </div>
        </Link>
      </section>
    </div>
  );
};

export default Index;
