import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { 
  Users, Search, UserPlus, ChevronRight, 
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UserAPI } from '@/services/api';

const Social = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'explore'>('followers');
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      setUserProfile(profile);

      try {
        const data = await UserAPI.getAll();
        const filtered = data.filter((p: any) => p.mobile !== profile.mobile);
        setAthletes(filtered);
      } catch (e) {
        const local = JSON.parse(localStorage.getItem('registered_users') || '[]');
        setAthletes(local.filter((p: any) => p.mobile !== profile.mobile));
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredAthletes = athletes.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.smashId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.smash_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show all athletes in explore tab; followers/following not yet implemented
  const displayList = filteredAthletes;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />
      
      <main className="container max-w-lg px-4 py-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-sky-500" />
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.4em]">Athlete Network</span>
          </div>
        <h1 className="text-4xl font-black text-[#0B1F3A] tracking-tighter uppercase italic leading-none">Athletes</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Find Athletes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 bg-white border-slate-100 rounded-2xl font-bold focus:border-sky-500 shadow-sm"
          />
        </div>



        <div className="space-y-3">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-sky-500 h-8 w-8" /></div>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayList.length > 0 ? displayList.map((p, idx) => (
                <motion.div 
                  layout
                  key={p.id || idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => navigate(`/player/${p.id || p.mobile}`)}
                  className="app-card p-4 flex items-center justify-between bg-white cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[#0B1F3A] flex items-center justify-center text-xs font-black text-sky-400 uppercase shadow-inner overflow-hidden">
                      {p.avatar || p.image ? (
                        <img src={p.avatar || p.image} className="w-full h-full object-cover" alt="" />
                      ) : (
                        p.name[0]
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-[#0B1F3A] uppercase italic leading-none group-hover:text-sky-600 transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                        {p.smash_id || p.smashId || '—'} • {p.state || 'India'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                    <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-sky-500 transition-all" />
                  </div>
                </motion.div>
              )) : (
                <div className="py-24 text-center border-2 border-dashed rounded-[2.5rem] bg-white border-slate-200">
                  <Users className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase italic">No connections found in this scope</p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

export default Social;