import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useParams, useNavigate } from 'react-router-dom';
import { MatchAPI } from '@/services/api';
import {
  ChevronLeft, Trophy, Zap, Target, AlertCircle,
  Share2, Loader2, Radio, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { showSuccess } from '@/utils/toast';
import { shareScorecard, shareLiveMatch, copyToClipboard } from '@/utils/share';

const actionIcon = (action: string) => {
  const a = (action || '').toLowerCase();
  if (a === 'smash') return <Zap className="h-3.5 w-3.5 text-sky-500" />;
  if (a === 'net')   return <Target className="h-3.5 w-3.5 text-emerald-500" />;
  if (a === 'error') return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
  return <Zap className="h-3.5 w-3.5 text-slate-400" />;
};

const actionLabel = (action: string) => {
  const a = (action || '').toLowerCase();
  if (a === 'smash') return 'Smash';
  if (a === 'net')   return 'Net Kill';
  if (a === 'error') return 'Error';
  return 'Point';
};

const MatchScorecard = () => {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState(0);

  useEffect(() => {
    if (!id) return;
    MatchAPI.getById(id)
      .then(data => { setMatch(data); setActiveGame(0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-sky-500 h-10 w-10" />
    </div>
  );

  if (!match) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Match not found</p>
      <Button onClick={() => navigate(-1)} className="bg-[#0B1F3A] text-white rounded-xl font-black uppercase text-[10px]">Go Back</Button>
    </div>
  );

  const p1Name = match.players?.p1?.name || match.players?.sideA?.[0]?.name || 'Side A';
  const p2Name = match.players?.p2?.name || match.players?.sideB?.[0]?.name || 'Side B';
  const gameScores: any[] = match.game_scores || [];
  const events: any[] = match.events || [];
  const setsWon: [number, number] = match.sets_won || [0, 0];
  const isDone = match.status === 'completed';
  const isLive = match.status === 'live';

  // Group events by game number
  const eventsByGame: Record<number, any[]> = {};
  events.forEach(e => {
    const g = e.game || 1;
    if (!eventsByGame[g]) eventsByGame[g] = [];
    eventsByGame[g].push(e);
  });

  const totalGames = Math.max(gameScores.length, Object.keys(eventsByGame).length, 1);
  const gameNumbers = Array.from({ length: totalGames }, (_, i) => i + 1);

  const shareScorecard = () => {
    const url = `${window.location.origin}/match/${id}`;
    const p1 = match?.players?.p1?.name || match?.players?.sideA?.[0]?.name || 'Side A';
    const p2 = match?.players?.p2?.name || match?.players?.sideB?.[0]?.name || 'Side B';
    const setsWon = match?.sets_won || [0, 0];
    const games = (match?.game_scores || []).map((g: any, i: number) => `Game ${i+1}: ${g.scoreA}-${g.scoreB}`).join(' | ');
    const text = `🏸 Match Result: ${match?.name || 'SmashLive Match'}\n${p1} ${setsWon[0]}-${setsWon[1]} ${p2}\n${games}\nFull scorecard: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/match/${id}`);
    showSuccess('Scorecard link copied!');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Back + share */}
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate(-1)} variant="ghost"
            className="h-9 px-3 font-black text-[9px] uppercase tracking-widest border bg-white rounded-xl">
            <ChevronLeft className="mr-1 h-3 w-3" /> Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={copyLink} variant="outline"
              className="h-9 px-3 font-black text-[9px] uppercase tracking-widest rounded-xl gap-1.5 border-slate-200">
              <Share2 className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button onClick={shareScorecard}
              className="h-9 px-3 font-black text-[9px] uppercase tracking-widest rounded-xl gap-1.5 bg-green-500 hover:bg-green-600 text-white border-none">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* Match header */}
        <div className="app-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black text-[#0B1F3A] uppercase italic leading-tight">
              {match.name || 'Match Scorecard'}
            </h1>
            {isLive ? (
              <Badge className="bg-red-500 text-white border-none text-[8px] font-black uppercase animate-pulse flex items-center gap-1">
                <Radio className="h-2.5 w-2.5" /> Live
              </Badge>
            ) : isDone ? (
              <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase">
                Completed
              </Badge>
            ) : null}
          </div>

          {/* Score summary */}
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="text-center">
              <p className="font-black text-[#0B1F3A] uppercase italic text-sm leading-tight truncate">{p1Name}</p>
              <p className="text-3xl font-black text-sky-600 mt-1">{setsWon[0]}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Games</p>
              {isDone && match.winner && (
                <p className="text-[8px] font-black text-amber-500 uppercase mt-1">
                  {match.winner === 1 ? p1Name : p2Name} wins
                </p>
              )}
            </div>
            <div className="text-center">
              <p className="font-black text-[#0B1F3A] uppercase italic text-sm leading-tight truncate">{p2Name}</p>
              <p className="text-3xl font-black text-[#0B1F3A] mt-1">{setsWon[1]}</p>
            </div>
          </div>

          {/* Game-by-game scores */}
          {gameScores.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Game Scores</p>
              <div className="space-y-1.5">
                {gameScores.map((g: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Game {i + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'text-sm font-black',
                        g.winner === 1 ? 'text-sky-600' : 'text-slate-400'
                      )}>{g.scoreA}</span>
                      <span className="text-[9px] text-slate-300">–</span>
                      <span className={cn(
                        'text-sm font-black',
                        g.winner === 2 ? 'text-[#0B1F3A]' : 'text-slate-400'
                      )}>{g.scoreB}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Game selector tabs */}
        {totalGames > 1 && (
          <div className="flex gap-2">
            {gameNumbers.map(g => (
              <button key={g} onClick={() => setActiveGame(g - 1)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all',
                  activeGame === g - 1 ? 'bg-[#0B1F3A] text-white' : 'bg-white text-slate-400 border border-slate-100'
                )}>
                Game {g}
              </button>
            ))}
          </div>
        )}

        {/* Point-by-point timeline */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
            Point by Point — Game {activeGame + 1}
          </h2>

          {(eventsByGame[activeGame + 1] || []).length === 0 ? (
            <div className="py-12 text-center bg-white border-2 border-dashed border-slate-100 rounded-3xl">
              <p className="text-[10px] font-black text-slate-400 uppercase italic">
                {isLive ? 'Waiting for first point...' : 'No events recorded for this game'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...(eventsByGame[activeGame + 1] || [])].reverse().map((e: any, idx: number) => {
                const scorerSide = e.side === 1 ? p1Name : p2Name;
                const isSideA = e.side === 1;
                const pointScore = e.score as [number, number] | undefined;

                return (
                  <div key={idx} className={cn(
                    'app-card p-3 flex items-center gap-3',
                    e.action?.toLowerCase() === 'error' && 'border-red-100'
                  )}>
                    {/* Score pill */}
                    {pointScore && (
                      <div className="bg-slate-50 rounded-lg px-2.5 py-1 text-center shrink-0 min-w-[48px]">
                        <p className="text-sm font-black font-mono text-[#0B1F3A]">
                          {pointScore[0]}–{pointScore[1]}
                        </p>
                      </div>
                    )}

                    {/* Action icon */}
                    <div className="shrink-0">
                      {actionIcon(e.action)}
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-[#0B1F3A] uppercase leading-tight">
                        {actionLabel(e.action)}
                        {e.action?.toLowerCase() === 'error' ? ' (opponent gains)' : ''}
                      </p>
                      <p className={cn(
                        'text-[9px] font-bold uppercase tracking-widest truncate',
                        isSideA ? 'text-sky-500' : 'text-slate-500'
                      )}>
                        {scorerSide}
                      </p>
                    </div>

                    {/* Time */}
                    {e.timestamp && (
                      <p className="text-[8px] font-black text-slate-300 uppercase shrink-0">
                        {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* View live broadcast if still active */}
        {(isLive || isDone) && (
          <Button
            onClick={() => navigate(`/broadcast/${id}`)}
            className="w-full h-14 bg-[#0B1F3A] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border-none shadow-xl"
          >
            {isLive ? <><Radio className="h-4 w-4 mr-2 animate-pulse" /> Watch Live</> : <><Trophy className="h-4 w-4 mr-2" /> Full Broadcast</>}
          </Button>
        )}

      </main>
    </div>
  );
};

export default MatchScorecard;
