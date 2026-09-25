import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import SmashRating from '@/components/dashboard/SmashRating';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import { motion } from 'framer-motion';
import { 
  Trophy, Zap, Activity, Loader2, 
  ChevronRight, Calendar, Users, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { MatchAPI, TournamentAPI, AnalyticsAPI, UserAPI } from '@/services/api';
import { AuthService } from '@/services/auth.service';
import { cn } from '@/lib/utils';
import { useSocketEvent } from '@/hooks/use-socket';
import { MatchCardSkeleton } from '@/components/ui/skeleton-cards';

const RecentResults = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    MatchAPI.getAll('completed').then(data => setResults(data.slice(0, 3))).catch(() => {});
  }, []);

  if (results.length === 0) return (
    <div className="py-6 text-center bg-white/50 border border-dashed rounded-xl border-slate-200">
      <p className="text-[11px] font-black text-slate-400 uppercase italic">No completed matches yet</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {results.map((m, i) => {
        const p1 = m.players?.p1?.name || m.players?.sideA?.[0]?.name || 'Side A';
        const p2 = m.players?.p2?.name || m.players?.sideB?.[0]?.name || 'Side B';
        const winner = m.winner === 1 ? p1 : p2;
        const games = (m.game_scores || []).map((g: any) => `${g.scoreA}-${g.scoreB}`).join(', ');
        return (
          <div key={i} onClick={() => navigate(`/match/${m._id || m.id}`)}
            className="app-card p-3 flex items-center gap-3 cursor-pointer active-press group">
            <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-[#0B1F3A] uppercase truncate">{p1} vs {p2}</p>
              <p className="text-[9px] font-bold text-sky-600 uppercase">{winner} won · {games}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-sky-500" />
          </div>
        );
      })}
    </div>
  );
};

const Court = () => {
  const navigate = useNavigate();
  const [matches,     setMatches]     = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [profile,     setProfile]     = useState<any>(null);
  const [stats,       setStats]       = useState<any>(null);
  const [userRank,    setUserRank]    = useState<number | null>(null);
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

      // Merge with local matches — only truly live ones created in last 24h
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const localMatches = JSON.parse(localStorage.getItem('cache_matches_live') || '[]')
        .filter((m: any) =>
          m.status === 'live' &&
          !m.winner &&
          !m.matchCompleted &&
          new Date(m.createdAt || 0).getTime() > oneDayAgo
        );
      const backendIds = new Set(activeMatches.map((m: any) => m._id || m.id));
      const merged = [...activeMatches, ...localMatches.filter((m: any) => !backendIds.has(m.id))];

      setMatches(merged.slice(0, 4));
      setTournaments(activeTourneys.slice(0, 3));
      setSiteStats(analytics);

      // Fetch own stats if logged in
      if (prof?._id || prof?.id) {
        try {
          const s = await UserAPI.getStats(prof._id || prof.id);
          setStats(s.stats);
          // Compute rank from world rankings
          try {
            const rankings = await UserAPI.getRankings('world');
            const idx = rankings.findIndex((u: any) => String(u._id) === String(prof._id || prof.id));
            if (idx !== -1) setUserRank(idx + 1);
          } catch {}
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
  // Remove from live cache when match completes
  useSocketEvent('feed:match_completed', (match: any) => {
    const id = match._id || match.id;
    const cached = JSON.parse(localStorage.getItem('cache_matches_live') || '[]');
    localStorage.setItem('cache_matches_live', JSON.stringify(
      cached.filter((m: any) => m.id !== id && m._id !== id)
    ));
    fetchData();
  });

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
          <SmashRating
            rating={stats?.rankingPoints || profile?.rankingPoints || 0}
            rank={userRank ?? undefined}
            level={(() => {
              const pts = stats?.rankingPoints ?? profile?.rankingPoints ?? 0;
              const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7000, 10000];
              const lvl = thresholds.filter(t => pts >= t).length;
              return Math.max(1, lvl);
            })()}
            xp={(() => {
              const pts = stats?.rankingPoints ?? profile?.rankingPoints ?? 0;
              const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7000, 10000];
              const lvl = thresholds.filter(t => pts >= t).length;
              const currentLvl = Math.max(1, lvl);
              const start = thresholds[currentLvl - 1] ?? 0;
              const end   = thresholds[currentLvl] ?? (start + 2000);
              return Math.round(((pts - start) / (end - start)) * 100);
            })()}
          />

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
            ) : matches.length > 0 ? matches.map((match, i) => {
              const p1 = match.players?.p1?.name || match.players?.sideA?.[0]?.name || 'Side A';
              const p2 = match.players?.p2?.name || match.players?.sideB?.[0]?.name || 'Side B';
              const score = match.current_score || [0, 0];
              const location = match.toss?.city || match.toss?.venue || match.city || match.venue || '';
              const matchId = match._id || match.id;
              const isLocal = String(matchId).startsWith('local_');
              const link = isLocal ? `/scoring/${matchId}` : `/broadcast/${matchId}`;
              return (
              <Link to={link} key={i} className="app-card p-4 space-y-2 block active-press">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                      <p className="text-[9px] font-black text-slate-400 uppercase truncate">{match.name}</p>
                      {location && <span className="text-[8px] font-bold text-slate-300 uppercase truncate">· {location}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-[#0B1F3A] uppercase truncate">{p1}</p>
                        <p className="font-black text-sm text-[#0B1F3A] uppercase truncate">{p2}</p>
                      </div>
                      <div className="bg-[#0B1F3A] px-4 py-2 rounded-xl text-center shrink-0 min-w-[64px]">
                        <p className="text-lg font-black font-mono text-sky-400 leading-none">{score[0]}-{score[1]}</p>
                        <p className="text-[7px] font-black text-sky-600 uppercase mt-0.5">Live</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}) : (
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

        {/* 5. Recent Results */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="uppercase italic flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-500" /> Recent Results
            </h2>
            <Link to="/smashed" className="text-[11px] font-black text-sky-600 uppercase">View All</Link>
          </div>
          <RecentResults />
        </section>
      </main>
    </div>
  );
};

export default Court;