import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import SmashRating from '@/components/dashboard/SmashRating';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import { motion } from 'framer-motion';
import { 
  Trophy, Zap, Activity, Loader2, 
  ChevronRight, Calendar, Users, Flame, MessageSquare, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { MatchAPI, TournamentAPI, AnalyticsAPI, UserAPI } from '@/services/api';
import { AuthService } from '@/services/auth.service';
import { cn } from '@/lib/utils';
import { useSocketEvent } from '@/hooks/use-socket';
import { MatchCardSkeleton } from '@/components/ui/skeleton-cards';

const Court = () => {
  const navigate = useNavigate();
  const [matches,     setMatches]     = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [profile,     setProfile]     = useState<any>(null);
  const [stats,       setStats]       = useState<any>(null);
  const [siteStats,   setSiteStats]   = useState<{ athletes: number; tourneys: number; participants: number } | null>(null);
  const [loading,     setLoading]     = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // 1. Seed UI immediately from localStorage
    const saved = localStorage.getItem('userProfile');
    let prof = saved ? JSON.parse(saved) : null;
    if (prof) setProfile(prof);

    // 2. Fetch fresh profile from backend and sync localStorage
    try {
      const fresh = await AuthService.getProfile();
      if (fresh) {
        // Preserve the token that is already in localStorage
        const token = AuthService.getToken();
        const merged = { ...fresh, token: token || (prof?.token ?? '') };
        AuthService.setLocalSession(merged as any);
        setProfile(merged);
        prof = merged;
      }
    } catch { /* backend unreachable — use localStorage copy */ }

    try {
      const [activeMatches, activeTourneys, analytics] = await Promise.all([
        MatchAPI.getAll('live'),
        TournamentAPI.getAll(),
        AnalyticsAPI.getStats(),
      ]);
      setMatches(activeMatches.slice(0, 4));
      setTournaments(activeTourneys.slice(0, 3));
      setSiteStats(analytics);

      // Fetch own stats if logged in
      if (prof?._id || prof?.id) {
        try {
          const s = await UserAPI.getStats(prof._id || prof.id);
          setStats(s.stats);
        } catch {}
      }
    } catch { /* offline — show empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time score updates on dashboard match cards
  useSocketEvent('feed:score_update', (payload) => {
    setMatches(prev => prev.map(m =>
      (m._id || m.id) === payload.matchId
        ? { ...m, current_score: payload.current_score }
        : m
    ));
  });
  useSocketEvent('feed:match_created', () => { fetchData(); });
  useSocketEvent('feed:match_completed', () => { fetchData(); });

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />
      
      <main className="px-4 py-4 space-y-5">
        {/* 1. Header & Quick Stats */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h1 className="uppercase italic">Hello, {profile?.name?.split(' ')[0] || "Athlete"}! 🔥</h1>
            <Badge className="bg-sky-500 text-white border-none text-[10px] font-black h-6 uppercase">Active</Badge>
          </div>
          <SmashRating rating={stats?.rankingPoints || profile?.rankingPoints || 0} level={1} xp={0} />

          {/* Personal quick stats */}
          {(stats || profile?.matchesPlayed > 0) && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Matches', val: stats?.matchesPlayed ?? profile?.matchesPlayed ?? 0, color: 'text-sky-600' },
                { label: 'Wins',    val: stats?.matchesWon   ?? profile?.matchesWon   ?? 0, color: 'text-green-600' },
                { label: 'Points',  val: stats?.rankingPoints ?? profile?.rankingPoints ?? 0, color: 'text-indigo-600' },
              ].map((s, i) => (
                <div key={i} className="app-card p-3 text-center">
                  <p className={cn('text-lg font-black', s.color)}>{s.val}</p>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Platform stats */}
          {siteStats && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { label: 'Athletes',     val: siteStats.athletes },
                { label: 'Tournaments',  val: siteStats.tourneys },
                { label: 'Participants', val: siteStats.participants },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2 shrink-0 shadow-sm">
                  <TrendingUp className="h-3 w-3 text-sky-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase">{s.label}</span>
                  <span className="text-sm font-black text-[#0B1F3A]">{s.val}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Global Search */}
        <GlobalSearch />

        {/* 3. Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Schedule', icon: Calendar, path: '/my-circuits', color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Matches', icon: Zap, path: '/smashed', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Tourney', icon: Trophy, path: '/tournaments', color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Social', icon: Users, path: '/social', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((action, i) => (
            <button 
              key={i} 
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-1.5 p-3 app-card active-press"
            >
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", action.bg, action.color)}>
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase text-[#0B1F3A]">{action.label}</span>
            </button>
          ))}
        </div>

        {/* 3. Live Feed */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="uppercase italic flex items-center gap-2">
              <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" /> Live Now
            </h2>
            <Link to="/live-match/active" className="text-[11px] font-black text-sky-600 uppercase">View All</Link>
          </div>
          
          <div className="flex flex-col gap-2">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <MatchCardSkeleton key={i} />)
            ) : matches.length > 0 ? matches.map((match, i) => (
              <Link to={`/broadcast/${match.id}`} key={i} className="app-card p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[10px] font-black text-slate-300 uppercase truncate mb-1">{match.name}</p>
                  <div className="space-y-0.5">
                    <p className="font-black text-sm text-[#0B1F3A] uppercase truncate">{match.players?.p1?.name || match.players?.sideA?.[0]?.name || "Side A"}</p>
                    <p className="font-black text-sm text-[#0B1F3A] uppercase truncate">{match.players?.p2?.name || match.players?.sideB?.[0]?.name || "Side B"}</p>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-xl text-center min-w-[70px]">
                  <p className="text-xl font-mono font-black text-sky-600 leading-none">
                    {match.current_score ? `${match.current_score[0]}-${match.current_score[1]}` : "0-0"}
                  </p>
                  <p className="text-[8px] font-black text-slate-300 uppercase mt-1">Live</p>
                </div>
              </Link>
            )) : (
              <div className="py-8 text-center bg-white/50 border border-dashed rounded-xl border-slate-200">
                <p className="text-[11px] font-black text-slate-400 uppercase italic">No active matches in network</p>
              </div>
            )}
          </div>
        </section>

        {/* 4. Tournament Section */}
        <section className="space-y-3">
          <h2 className="uppercase italic flex items-center gap-2 px-1">
            <Trophy className="h-4 w-4 text-amber-500" /> Featured Circuits
          </h2>
          <div className="flex flex-col gap-2">
            {tournaments.length > 0 ? tournaments.map((t, i) => (
              <Link to={`/tournament/${t.id}`} key={i} className="app-card flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#0B1F3A] flex items-center justify-center text-sky-400 shrink-0">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="uppercase italic leading-tight mb-0.5 truncate max-w-[180px]">{t.name}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.city} • {t.status}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            )) : (
              <div className="py-8 text-center bg-white/50 border border-dashed rounded-xl border-slate-200">
                <p className="text-[11px] font-black text-slate-400 uppercase italic">No circuits found</p>
              </div>
            )}
          </div>
        </section>

        {/* 5. Zero-State Feed */}
        <section className="space-y-3">
          <h2 className="uppercase italic flex items-center gap-2 px-1">
            <Users className="h-4 w-4 text-emerald-500" /> Network Activity
          </h2>
          <div className="app-card p-8 text-center border-dashed border-2 bg-slate-50/30">
            <MessageSquare className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-400 uppercase italic">Connect with athletes to see their match updates here.</p>
            <Button onClick={() => navigate('/social')} variant="ghost" className="mt-2 text-sky-600 font-black text-[9px] uppercase hover:bg-transparent">Find Athletes</Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Court;