import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, MapPin, Calendar, Search, Plus, ChevronRight, Trash2, Users, Activity, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TournamentAPI } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { TournamentCardSkeleton } from '@/components/ui/skeleton-cards';

const Tournaments = () => {
  const navigate = useNavigate();
  const [query, setQuery]         = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [tourneys, setTourneys]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  const profile       = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const currentUserId = profile._id || '';

  const loadTourneys = async () => {
    setLoading(true);
    try {
      const data = await TournamentAPI.getAll();
      const enriched = data.map(t => ({
        ...t,
        id:               t._id || t.id,
        participantCount: t.participantCount ?? 0,
        matchCount:       t.matchCount       ?? 0,
        organizer:        t.organizer || 'Organizer',
      }));
      setTourneys(enriched);
    } catch {
      setTourneys(JSON.parse(localStorage.getItem('active_studio_tournaments') || '[]'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTourneys();
    window.addEventListener('storage', loadTourneys);
    return () => window.removeEventListener('storage', loadTourneys);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will remove the circuit.')) return;
    try {
      await TournamentAPI.delete(id);
      showSuccess('Circuit Removed');
      loadTourneys();
    } catch {
      showError('Removal failed.');
    }
  };

  const isCreatorOf = (t: any) =>
    !!currentUserId && (!t.creatorId || String(t.creatorId) === String(currentUserId));

  const filtered = useMemo(() =>
    tourneys.filter(t => {
      const matchesSearch =
        (t.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (t.city || '').toLowerCase().includes(query.toLowerCase());
      const matchesTab = activeTab === 'All' || (t.status || '') === activeTab;
      return matchesSearch && matchesTab;
    }),
  [query, tourneys, activeTab]);

  return (
    <div className="min-h-screen bg-white pb-32">
      <Navbar />
      <main className="container max-w-4xl px-4 py-12 space-y-10">

        <div className="flex flex-col gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-[#0B1F3A] uppercase italic leading-none">Global Circuits</h1>
            <p className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">Operational Registry Hub</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <input
                placeholder="Search circuit name or city..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs shadow-sm focus:border-sky-500 outline-none"
              />
            </div>
            <Button
              onClick={() => navigate('/tournaments/create')}
              className="h-14 w-full bg-[#0B1F3A] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] gap-3 shadow-xl hover:bg-sky-500 transition-all active:scale-95"
            >
              <Plus className="h-5 w-5" /> New Circuit Protocol
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['All', 'registration_open', 'in_progress', 'completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm whitespace-nowrap',
                  activeTab === tab ? 'bg-[#0B1F3A] text-white' : 'bg-white text-slate-300 border border-slate-100 hover:border-sky-500'
                )}
              >
                {tab === 'All' ? 'All' : tab === 'registration_open' ? 'Open' : tab === 'in_progress' ? 'Live' : 'Done'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => <TournamentCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filtered.length > 0 ? filtered.map(t => {
                const canManage = isCreatorOf(t);
                return (
                  <motion.div
                    layout
                    key={t.id || t.slug}
                    className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div
                        className="flex items-start gap-4 cursor-pointer flex-1"
                        onClick={() => navigate(`/tournament/${t.id}`)}
                      >
                        <div className="h-14 w-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 shadow-inner shrink-0">
                          <Trophy className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={cn('h-6 px-3 border-none text-[8px] font-black uppercase rounded-full',
                              t.status === 'registration_open' ? 'bg-green-500 text-white' :
                              t.status === 'in_progress'       ? 'bg-red-500 text-white' :
                              t.status === 'completed'          ? 'bg-slate-400 text-white' :
                              'bg-sky-500 text-white')}>
                              {t.status?.replace(/_/g, ' ') || 'Open'}
                            </Badge>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                              ID: {String(t.id).slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black text-[#0B1F3A] uppercase italic leading-none">{t.name}</h3>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t.city && <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-sky-500" /> {t.city}</span>}
                            {(t.start_date || t.startDate) && <>
                              <span className="h-1 w-1 bg-slate-200 rounded-full" />
                              <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-sky-500" /> {t.start_date || t.startDate}</span>
                            </>}
                          </div>
                        </div>
                      </div>

                      {/* Only show Manage/Delete to creator */}
                      {canManage && (
                        <div className="flex items-center gap-3 self-end md:self-center">
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="h-10 w-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                          <Button
                            onClick={() => navigate(`/tournament/${t.id}`)}
                            className="h-14 px-8 bg-[#0B1F3A] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-sky-500 active:scale-95 transition-all"
                          >
                            Manage <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Non-creator: View button */}
                      {!canManage && (
                        <Button
                          onClick={() => navigate(`/tournament/${t.id}`)}
                          variant="outline"
                          className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 self-end md:self-center"
                        >
                          View <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-50 relative z-10">
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-1 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-sky-600 mb-1">
                          <User className="h-3 w-3" />
                          <p className="text-[8px] font-black uppercase tracking-widest">Organizer</p>
                        </div>
                        <p className="text-[11px] font-black text-[#0B1F3A] truncate px-1">{t.organizer}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-1 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-indigo-600 mb-1">
                          <Users className="h-3 w-3" />
                          <p className="text-[8px] font-black uppercase tracking-widest">Entries</p>
                        </div>
                        <p className="text-xl font-black text-[#0B1F3A]">{t.participantCount}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl space-y-1 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-amber-600 mb-1">
                          <Activity className="h-3 w-3" />
                          <p className="text-[8px] font-black uppercase tracking-widest">Matches</p>
                        </div>
                        <p className="text-xl font-black text-[#0B1F3A]">{t.matchCount}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="py-40 text-center border-2 border-dashed rounded-[3rem] bg-white border-slate-100 space-y-3 opacity-60">
                  <Trophy className="h-12 w-12 text-slate-200 mx-auto" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No circuits found</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tournaments;
