import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Search, User, ChevronRight, Loader2, Flame, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserAPI } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

const Players = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UserAPI.getAll()
      .then(data => { setPlayers(data); setFiltered(data); })
      .catch(() => { setPlayers([]); setFiltered([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) { setFiltered(players); return; }
    setFiltered(players.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.smashId?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q)
    ));
  }, [query, players]);

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />
      <main className="px-4 py-8 space-y-6 max-w-lg mx-auto">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-sky-500" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">Athlete Directory</span>
          </div>
          <h1 className="text-4xl font-black text-[#0B1F3A] uppercase italic leading-none">Players</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <input
            placeholder="Search name, Smash ID, state..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full h-14 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl font-bold text-sm shadow-sm focus:border-sky-500 outline-none transition-all"
          />
        </div>

        {/* Stats bar */}
        <div className="app-card p-4 flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-2xl font-black text-[#0B1F3A]">{players.length}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Athletes</p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="text-center flex-1">
            <p className="text-2xl font-black text-sky-600">
              {players.filter(p => p.matchesPlayed > 0).length}
            </p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active</p>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="text-center flex-1">
            <p className="text-2xl font-black text-amber-500">
              {[...new Set(players.map(p => p.state).filter(Boolean))].length}
            </p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">States</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.length > 0 ? filtered.map((p, idx) => (
                <motion.div
                  key={p._id || idx}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => navigate(`/player/${p._id || p.mobile}`)}
                  className="app-card p-4 flex items-center gap-4 cursor-pointer active-press group"
                >
                  <div className="h-12 w-12 rounded-full bg-[#0B1F3A] flex items-center justify-center text-sky-400 font-black text-sm uppercase shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    {p.name?.[0] || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#0B1F3A] uppercase italic text-sm leading-tight truncate group-hover:text-sky-600 transition-colors">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {p.smashId && (
                        <span className="text-[8px] font-black text-sky-500 uppercase tracking-widest bg-sky-50 px-2 py-0.5 rounded-full">
                          {p.smashId}
                        </span>
                      )}
                      {p.state && (
                        <span className="text-[8px] font-bold text-slate-400 uppercase">{p.state}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {p.rankingPoints > 0 && (
                      <div className="text-right">
                        <p className="text-xs font-black text-[#0B1F3A]">{p.rankingPoints}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase">pts</p>
                      </div>
                    )}
                    {p.currentStreak > 1 && (
                      <div className="flex items-center gap-0.5 text-orange-500">
                        <Flame className="h-3 w-3" />
                        <span className="text-[10px] font-black">{p.currentStreak}</span>
                      </div>
                    )}
                    {p.matchesPlayed > 0 && (
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-500">{p.matchesPlayed}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase">played</p>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-sky-500 transition-colors" />
                  </div>
                </motion.div>
              )) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-white">
                  <Zap className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">No players found</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Players;
