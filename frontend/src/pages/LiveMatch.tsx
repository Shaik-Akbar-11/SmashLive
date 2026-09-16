import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, Play, Search, Zap, Radio, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchAPI, TournamentAPI } from '@/services/api';
import { useSocketEvent } from '@/hooks/use-socket';

const LiveMatch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories = ["All", "Matches", "Tournaments"];

  const fetchLiveData = async () => {
    try {
      const [matches, tourneys] = await Promise.all([
        MatchAPI.getAll('live'),
        TournamentAPI.getAll(),
      ]);
      setLiveMatches(matches.map((m: any) => ({ ...m, id: m._id || m.id })));
      setLiveTournaments(tourneys.map((t: any) => ({ ...t, id: t._id || t.id })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  // Real-time: update score on existing live match card
  useSocketEvent('feed:score_update', (payload) => {
    setLiveMatches(prev => prev.map(m =>
      (m._id || m.id) === payload.matchId
        ? { ...m, current_score: payload.current_score, serving: payload.serving, status: payload.status }
        : m
    ));
  });

  // Real-time: new match went live
  useSocketEvent('feed:match_created', (match) => {
    const normalized = { ...match, id: match._id || match.id };
    setLiveMatches(prev => {
      if (prev.find(m => (m._id || m.id) === normalized.id)) return prev;
      return [normalized, ...prev];
    });
  });

  useSocketEvent('feed:match_started', (match) => {
    const normalized = { ...match, id: match._id || match.id };
    setLiveMatches(prev => {
      if (prev.find(m => (m._id || m.id) === normalized.id)) {
        return prev.map(m => (m._id || m.id) === normalized.id ? { ...m, status: 'live' } : m);
      }
      return [normalized, ...prev];
    });
  });

  // Real-time: match completed — remove from live list
  useSocketEvent('feed:match_completed', (match) => {
    setLiveMatches(prev => prev.filter(m => (m._id || m.id) !== String(match._id)));
  });

  const filteredItems = useMemo(() => {
    const matches = liveMatches.map(m => ({
      id: m.id,
      type: 'match',
      title: m.name,
      p1: m.players?.p1?.name || m.players?.sideA?.[0]?.name || "Player A",
      p2: m.players?.p2?.name || m.players?.sideB?.[0]?.name || "Player B",
      score: m.current_score ? `${m.current_score[0]}-${m.current_score[1]}` : "0-0",
      category: "Match",
      path: `/broadcast/${m.id}`
    }));

    const tourneys = liveTournaments.map(t => ({
      id: t.id,
      type: 'tournament',
      title: t.name,
      loc: t.city,
      category: "Tournament",
      path: `/tournament/${t.id}`
    }));

    const all = [...matches, ...tourneys];

    return all.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(query.toLowerCase()) || 
                           (item.p1 && item.p1.toLowerCase().includes(query.toLowerCase())) ||
                           (item.p2 && item.p2.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = activeCategory === "All" || item.category + "s" === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [query, activeCategory, liveMatches, liveTournaments]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />
      <main className="px-4 py-8 space-y-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-sky-500 fill-current" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Real-time Feed</span>
          </div>
          <h1 className="text-3xl font-black text-[#0B1F3A] uppercase italic">Live Matches</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search Player or Event..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 pl-12 bg-white border-slate-100 rounded-2xl font-bold focus:border-sky-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "whitespace-nowrap px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeCategory === cat ? "bg-[#0B1F3A] text-white shadow-xl" : "bg-white text-slate-400 border border-slate-100"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {isLoading ? (
             <div className="py-32 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-sky-500 animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checking the court...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredItems.length > 0 ? filteredItems.map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className="app-card p-6 flex flex-col gap-6"
                  >
                    <div className="flex justify-between items-start">
                      <Badge className={cn(
                        "text-white border-none text-[9px] font-black uppercase px-3 h-6",
                        item.type === 'match' ? "bg-[#0B1F3A]" : "bg-sky-500"
                      )}>
                        {item.category}
                      </Badge>
                      <Radio className="h-3 w-3 text-red-500 animate-pulse" />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">{item.title}</p>
                        {item.type === 'match' ? (
                          <div className="font-black text-lg text-[#0B1F3A] uppercase italic leading-none">
                            {item.p1} <br />
                            <span className="text-sky-500 opacity-20 text-xs">VS</span> <br />
                            {item.p2}
                          </div>
                        ) : (
                          <div className="font-black text-xl text-[#0B1F3A] uppercase italic leading-none">
                            {item.title}
                          </div>
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
          )}
        </div>
      </main>
    </div>
  );
};

export default LiveMatch;