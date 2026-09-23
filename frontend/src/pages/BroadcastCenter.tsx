import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import BroadcastActionCard from '@/components/broadcast/BroadcastActionCard';
import PlayerBroadcastStats from '@/components/broadcast/PlayerBroadcastStats';
import {
  Radio, Trophy, Target,
  Calendar, Clock, Users, ChevronRight,
  Copy, Check, Loader2, Shuffle, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TournamentAPI } from '@/services/api';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_COLOR: Record<string, string> = {
  registration_open:   'bg-green-500',
  registration_closed: 'bg-amber-500',
  draw_generated:      'bg-sky-500',
  in_progress:         'bg-red-500',
  completed:           'bg-slate-400',
};

const STATUS_LABEL: Record<string, string> = {
  registration_open:   'Open',
  registration_closed: 'Closed',
  draw_generated:      'Draw Ready',
  in_progress:         'Live',
  completed:           'Done',
};

const BroadcastCenter = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime]   = useState(new Date());
  const [myTourneys,  setMyTourneys]    = useState<any[]>([]);
  const [loading,     setLoading]       = useState(true);
  const [copied,      setCopied]        = useState<string | null>(null);

  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    TournamentAPI.getAll()
      .then(data => {
        // Show tournaments created by this user (match by creatorId or legacy organizer name)
        const mine = data.filter(t =>
          (t.creatorId && t.creatorId === profile._id) ||
          t.organizer === profile.name ||
          t.organizer === profile.mobile
        );
        setMyTourneys(mine);
      })
      .catch(() => setMyTourneys([]))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = (slug: string, id: string) => {
    const key = slug || id;
    navigator.clipboard.writeText(`${window.location.origin}/register/${key}`);
    setCopied(key);
    showSuccess('Registration link copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerateDraw = async (id: string) => {
    try {
      await TournamentAPI.generateDraw(id);
      showSuccess('Draw generated!');
      const data = await TournamentAPI.getAll();
      setMyTourneys(data.filter(t =>
        (t.creatorId && t.creatorId === profile._id) ||
        t.organizer === profile.name || t.organizer === profile.mobile
      ));
    } catch (e: any) { showError(e.message); }
  };

  const handleCloseReg = async (id: string) => {
    try {
      await TournamentAPI.closeRegistration(id);
      showSuccess('Registration closed');
      const data = await TournamentAPI.getAll();
      setMyTourneys(data.filter(t =>
        (t.creatorId && t.creatorId === profile._id) ||
        t.organizer === profile.name || t.organizer === profile.mobile
      ));
    } catch (e: any) { showError(e.message); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#0B1F3A] p-2.5 rounded-xl text-sky-400">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase italic text-[#0B1F3A]">Match Center</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-3 w-3" /> {currentTime.toLocaleDateString()}
              <span className="h-1 w-1 bg-slate-200 rounded-full" />
              <Clock className="h-3 w-3" /> {currentTime.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      <main className="px-4 py-8 space-y-8">
        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BroadcastActionCard
            title="Start Match"
            description="Setup a quick match with live scoring."
            icon={Target}
            buttonText="New Match"
            onClick={() => navigate('/live-match/create')}
            variant="primary"
          />
          <BroadcastActionCard
            title="New Tournament"
            description="Organize events and live brackets."
            icon={Trophy}
            buttonText="Create"
            onClick={() => navigate('/tournaments/create')}
            variant="secondary"
          />
        </div>

        {/* ── My Tournaments ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-sky-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0B1F3A]">My Tournaments</span>
            </div>
            <button onClick={() => navigate('/tournaments')}
              className="text-[9px] font-black text-sky-500 uppercase tracking-widest flex items-center gap-1">
              All <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-sky-500 h-6 w-6" /></div>
          ) : myTourneys.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
              <Trophy className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No tournaments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTourneys.map(t => {
                const tid   = t._id || t.id;
                const key   = t.slug || tid;
                const isCopied = copied === key;
                const canClose = t.status === 'registration_open';
                const canDraw  = ['registration_open', 'registration_closed'].includes(t.status)
                  && (t.participantCount || 0) >= 2;

                return (
                  <div key={tid} className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm space-y-4">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn('text-white border-none font-black text-[8px] uppercase px-2 h-5', STATUS_COLOR[t.status] || 'bg-slate-400')}>
                            {STATUS_LABEL[t.status] || t.status}
                          </Badge>
                          <span className="text-[8px] font-black text-slate-300 uppercase">
                            {t.format === 'round_robin' ? 'Round Robin' : 'Knockout'} · {t.category}
                          </span>
                        </div>
                        <h3 className="font-black text-[#0B1F3A] uppercase italic text-sm leading-tight truncate">{t.name}</h3>
                        <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-sky-500" />
                            {t.participantCount || 0} / {t.max_participants || '—'}
                          </span>
                          {t.start_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-sky-500" /> {t.start_date}
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => navigate(`/tournament/${tid}`)}
                        className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#0B1F3A] hover:text-white transition-all shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Action row */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                      {/* Copy registration link */}
                      {canClose && (
                        <Button onClick={() => copyLink(t.slug, tid)} size="sm" variant="outline"
                          className="h-9 rounded-xl font-black text-[9px] uppercase gap-1.5 border-slate-200 flex-1">
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {isCopied ? 'Copied' : 'Copy Entry Link'}
                        </Button>
                      )}

                      {/* Close registration */}
                      {canClose && (
                        <Button onClick={() => handleCloseReg(tid)} size="sm" variant="outline"
                          className="h-9 rounded-xl font-black text-[9px] uppercase gap-1.5 border-amber-200 text-amber-600 hover:bg-amber-50">
                          <Lock className="h-3.5 w-3.5" /> Close Reg
                        </Button>
                      )}

                      {/* Generate draw */}
                      {canDraw && (
                        <Button onClick={() => handleGenerateDraw(tid)} size="sm"
                          className="h-9 rounded-xl bg-[#0B1F3A] text-white font-black text-[9px] uppercase gap-1.5 hover:bg-sky-500 transition-all">
                          <Shuffle className="h-3.5 w-3.5" /> Generate Draw
                        </Button>
                      )}

                      {/* View roster */}
                      <Button onClick={() => navigate(`/tournament/${tid}`)} size="sm" variant="outline"
                        className="h-9 rounded-xl font-black text-[9px] uppercase gap-1.5 border-slate-200 flex-1">
                        <Users className="h-3.5 w-3.5" /> View Roster
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Player Stats */}
        <div className="pt-2">
          <PlayerBroadcastStats />
        </div>
      </main>
    </div>
  );
};

export default BroadcastCenter;
