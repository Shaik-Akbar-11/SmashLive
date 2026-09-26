import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import PremiumScoreboard from '@/components/broadcast/PremiumScoreboard';
import CommentaryFeed from '@/components/broadcast/CommentaryFeed';
import MatchStatGrid from '@/components/broadcast/MatchStatGrid';
import { Button } from '@/components/ui/button';
import { Trophy, Activity, Zap, Bell, Check, Loader2, ChevronLeft, MessageCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { MatchAPI } from '@/services/api';
import { getSocket } from '@/hooks/use-socket';

// ── Commentary generator ───────────────────────────────────────────────────
function buildCommentary(events: any[], p1Name: string, p2Name: string) {
  const smashPhrases   = ['Thunderous smash', 'Blistering attack', 'Powerful smash', 'Devastating drive'];
  const netPhrases     = ['Delicate net shot', 'Crafty net kill', 'Precise net drop', 'Clever net play'];
  const errorPhrases   = ['Unforced error', 'Net fault', 'Out of bounds', 'Loose shot'];
  const pointPhrases   = ['Rally won', 'Clean winner', 'Point secured', 'Well earned point'];

  return [...events].reverse().map((e: any, idx: number) => {
    const side = e.side === 1 ? p1Name : p2Name;
    const action = (e.action || '').toLowerCase();
    let phrase = '';

    if (action === 'smash')      phrase = smashPhrases[idx % smashPhrases.length];
    else if (action === 'net')   phrase = netPhrases[idx % netPhrases.length];
    else if (action === 'error') phrase = errorPhrases[idx % errorPhrases.length];
    else                         phrase = pointPhrases[idx % pointPhrases.length];

    const score = e.score ? `${e.score[0]}–${e.score[1]}` : '';
    return {
      id:   String(e.timestamp || idx),
      text: `${phrase} by ${side}. ${score ? `Score: ${score}` : ''}`,
      type: action === 'error' ? 'highlight' : 'score' as 'score' | 'highlight' | 'analysis',
      time: e.timestamp
        ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'LIVE',
    };
  });
}

// ── Match stats from events ────────────────────────────────────────────────
function computeStats(events: any[], gameScores?: any[]) {
  const points  = events.filter(e => e.type === 'point');
  const smashes = points.filter(e => (e.action || '').toLowerCase() === 'smash').length;
  const nets    = points.filter(e => (e.action || '').toLowerCase() === 'net').length;
  const errors  = points.filter(e => (e.action || '').toLowerCase() === 'error').length;
  const winners = smashes + nets;
  const total   = points.length;
  const accuracy = total > 0 ? `${Math.round(((total - errors) / total) * 100)}%` : '0%';

  // Longest game = game with most total points
  let longestGame = '--';
  if (gameScores && gameScores.length > 0) {
    let maxPts = 0, maxIdx = 0;
    gameScores.forEach((g: any, i: number) => {
      const pts = (g.scoreA || 0) + (g.scoreB || 0);
      if (pts > maxPts) { maxPts = pts; maxIdx = i; }
    });
    longestGame = `G${maxIdx + 1}: ${gameScores[maxIdx].scoreA}-${gameScores[maxIdx].scoreB}`;
  }

  return { totalRallies: total, longestGame, winners, accuracy, faults: errors, errors };
}

// ── Component ──────────────────────────────────────────────────────────────
const LiveBroadcast = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing]   = useState(false);
  const [matchData, setMatchData]       = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [connected, setConnected]       = useState(false);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  useEffect(() => {
    if (!id) return;

    // ── 1. Initial fetch ──────────────────────────────────────────────────
    MatchAPI.getById(id)
      .then(data => setMatchData(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // ── 2. Socket.IO — join match room ─────────────────────────────────────
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('match:join', id);
    setConnected(socket.connected);

    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Authoritative state on join / reconnect
    socket.on('match:state', (data: any) => {
      setMatchData(data);
      setLoading(false);
    });

    // Every scored point, undo, start, end
    socket.on('score:update', (payload: any) => {
      if ((payload.matchId || payload._id) !== id) return;
      setMatchData((prev: any) => prev ? { ...prev, ...payload } : payload);
    });

    socket.on('match:started',   (data: any) => { if (String(data._id) === id) setMatchData(data); });
    socket.on('match:completed', (data: any) => { if (String(data._id) === id) setMatchData(data); });

    return () => {
      socket.emit('match:leave', id);
      socket.off('match:state');
      socket.off('score:update');
      socket.off('match:started');
      socket.off('match:completed');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [id]);

  // ── Derived values ─────────────────────────────────────────────────────
  const p1Name  = matchData?.players?.p1?.name || matchData?.players?.sideA?.[0]?.name || 'Athlete A';
  const p2Name  = matchData?.players?.p2?.name || matchData?.players?.sideB?.[0]?.name || 'Athlete B';
  const setsWon = (matchData?.sets_won as [number, number]) || [0, 0];
  const serving = (matchData?.serving as 1 | 2) || 1;
  const events: any[] = matchData?.events || [];
  const gameScores: any[] = matchData?.game_scores || [];
  const isDone  = matchData?.status === 'completed';

  // Check if current user is the creator
  const myId = (() => { try { return JSON.parse(localStorage.getItem('userProfile') || '{}')._id || ''; } catch { return ''; } })();
  const isCreator = !!myId && !!matchData?.createdBy && String(matchData.createdBy) === String(myId);

  // For completed matches show last game score, not the reset 0-0
  const rawScore = (matchData?.current_score as [number, number]) || [0, 0];
  const lastGame = gameScores[gameScores.length - 1];
  const score: [number, number] = isDone && lastGame
    ? [lastGame.scoreA, lastGame.scoreB]
    : rawScore;

  const commentary = buildCommentary(events, p1Name, p2Name);
  const stats      = computeStats(events, gameScores);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-sky-500 h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-[#0B1F3A] pb-32">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate(-1)} variant="ghost" className="h-9 px-3 font-black text-[9px] uppercase tracking-widest border bg-white rounded-xl">
            <ChevronLeft className="mr-1 h-3 w-3" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', connected ? 'bg-green-500 animate-pulse' : 'bg-slate-300')} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {connected ? 'Live' : 'Connecting...'}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-tight uppercase italic flex items-center gap-3">
            <Trophy className="h-5 w-5 text-sky-500" />
            {matchData?.name || 'Live Match'}
          </h1>
          <div className="flex items-center gap-3 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Court {matchData?.court || '--'}</span>
            <span className="h-1 w-1 bg-slate-200 rounded-full" />
            <span className={cn(isDone ? 'text-slate-400' : 'text-red-500 animate-pulse')}>
              {isDone ? 'COMPLETED' : 'LIVE BROADCAST'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          {isCreator && !isDone && (
            <Button
              onClick={() => navigate(`/scoring/${id}`)}
              className="flex-1 h-11 rounded-2xl bg-[#0B1F3A] text-white font-black text-[9px] uppercase tracking-widest gap-2 border-none hover:bg-sky-500 transition-all"
            >
              <Zap className="h-4 w-4 fill-current" /> Score Match
            </Button>
          )}
          <Button
            onClick={() => setIsFollowing(f => !f)}
            variant="outline"
            className={cn(
              'flex-1 h-11 rounded-2xl text-[9px] font-black uppercase tracking-widest gap-2',
              isFollowing ? 'bg-sky-500 text-white border-none shadow-md' : 'border-slate-200'
            )}
          >
            {isFollowing ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {isFollowing ? 'Following' : 'Notify'}
          </Button>
          <Button
            onClick={() => {
              const p1 = matchData?.players?.p1?.name || matchData?.players?.sideA?.[0]?.name || 'Side A';
              const p2 = matchData?.players?.p2?.name || matchData?.players?.sideB?.[0]?.name || 'Side B';
              const sc = score || [0, 0];
              const url = `${window.location.origin}/broadcast/${id}`;
              const text = `🏸 LIVE: ${matchData?.name || 'SmashLive Match'}\n${p1} ${sc[0]}-${sc[1]} ${p2}\nWatch live: ${url}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="flex-1 h-11 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black text-[9px] uppercase tracking-widest gap-2 border-none"
          >
            <MessageCircle className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      <main className="container px-4 py-6 space-y-8">

        {/* Scoreboard */}
        <section>
          <PremiumScoreboard
            p1={{ name: p1Name, country: matchData?.players?.p1?.state || '', flag: '🏳️', sets: [setsWon[0]] }}
            p2={{ name: p2Name, country: matchData?.players?.p2?.state || '', flag: '🏳️', sets: [setsWon[1]] }}
            currentScore={score}
            serving={serving}
          />
        </section>

        {/* Game score history */}
        {gameScores.length > 0 && (
          <section className="flex gap-2 flex-wrap">
            {gameScores.map((g: any, i: number) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase shadow-sm">
                Game {i + 1}: {g.scoreA}–{g.scoreB}
              </div>
            ))}
          </section>
        )}

        {/* Winner banner */}
        {isDone && matchData?.winner && (
          <section className="bg-yellow-50 border border-yellow-200 rounded-3xl p-5 text-center space-y-1">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto" />
            <p className="font-black text-[#0B1F3A] text-lg uppercase italic">
              {matchData.winner === 1 ? p1Name : p2Name} Wins!
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {setsWon[0]}–{setsWon[1]} in games
            </p>
          </section>
        )}

        {/* Commentary */}
        <section className="space-y-4">
          <h2 className="text-[13px] font-black uppercase italic flex items-center gap-2 px-2">
            <Zap className="h-4 w-4 text-sky-500 fill-current" /> Commentary
          </h2>
          <CommentaryFeed events={commentary} />
        </section>

        {/* Stats */}
        <section className="space-y-4">
          <h2 className="text-[13px] font-black uppercase italic flex items-center gap-2 px-2">
            <Activity className="h-4 w-4 text-sky-500" /> Intelligence
          </h2>
          <MatchStatGrid stats={stats} />
        </section>

      </main>
    </div>
  );
};

export default LiveBroadcast;
