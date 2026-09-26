import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Zap, Target, X, ChevronLeft, Loader2, AlertCircle, Trophy, Undo2, StopCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { MatchAPI } from '@/services/api';

const API_URL   = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const SOCKET_URL = API_URL.replace('/api', '');

// ── Local badminton scoring (offline fallback) ────────────────────────────────
function localScorePoint(match: any, side: 1 | 2) {
  const score      = [...(match.current_score || [0, 0])] as [number, number];
  const setsWon    = [...(match.sets_won    || [0, 0])]   as [number, number];
  const gameScores = [...(match.game_scores || [])];
  let currentGame  = match.current_game || 1;
  let status       = match.status || 'live';
  let winner       = match.winner || null;

  score[side - 1]++;

  const [a, b]   = score;
  const gameOver =
    (a >= 21 && a - b >= 2) ||
    (b >= 21 && b - a >= 2) ||
    a === 30 || b === 30;

  let gameCompleted  = false;
  let matchCompleted = false;

  if (gameOver) {
    gameCompleted = true;
    const gw: 1 | 2 = a > b ? 1 : 2;
    setsWon[gw - 1]++;
    gameScores.push({ scoreA: a, scoreB: b, winner: gw });

    const needed = Math.ceil((match.total_sets || 3) / 2);
    if (setsWon[gw - 1] >= needed) {
      matchCompleted = true;
      status = 'completed';
      winner = gw;
    } else {
      score[0] = 0;
      score[1] = 0;
      currentGame++;
    }
  }

  return {
    ...match,
    current_score: gameCompleted && !matchCompleted ? [0, 0] : score,
    sets_won:    setsWon,
    game_scores: gameScores,
    current_game: currentGame,
    serving:     side,
    status,
    winner,
    gameCompleted,
    matchCompleted,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
const ScoringPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate    = useNavigate();
  const [matchData,     setMatchData]     = useState<any>(null);
  const [loading,       setLoading]       = useState(true);
  const [scoring,       setScoring]       = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<1 | 2 | null>(null);
  const socketRef = useRef<any>(null);

  // Check if current user is the creator
  const myProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const myId = myProfile?._id || myProfile?.id;
  const isCreator = (match: any) => {
    if (!match?.createdBy) return true; // legacy matches — allow
    return String(match.createdBy) === String(myId) || String(match.createdBy?._id) === String(myId);
  };

  // ── Load match ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;

    const load = async () => {
      try {
        const data = await MatchAPI.getById(matchId);
        setMatchData(data);
      } catch {
        const local = localStorage.getItem(matchId);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.status === 'scheduled') parsed.status = 'live';
          setMatchData(parsed);
        } else {
          navigate('/broadcast/center');
        }
      } finally {
        setLoading(false);
      }
    };
    load();

    // Socket.IO — dynamic import so it doesn't break when backend is offline
    import('socket.io-client').then(({ io }) => {
      const socket = io(SOCKET_URL, { transports: ['websocket'] });
      socketRef.current = socket;
      socket.emit('match:join', matchId);
      socket.on('match:state',     (d: any) => setMatchData(d));
      socket.on('match:completed', (d: any) => setMatchData(d));
      socket.on('score:update',    (d: any) => {
        setMatchData((prev: any) => prev ? { ...prev, ...d } : d);
        if (d.matchCompleted)     showSuccess('Match Complete!');
        else if (d.gameCompleted) showSuccess('Game Complete!');
      });
    }).catch(() => {
      // No backend — offline mode only
    });
    return () => {
      // Use ref — safe even if socket promise hasn't resolved yet
      if (socketRef.current) {
        socketRef.current.emit('match:leave', matchId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [matchId, navigate]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const isLocalMatch = matchId?.startsWith('local_');

  const handlePoint = async (side: 1 | 2, action: string) => {
    if (!matchId || scoring) return;
    if (matchData?.status === 'completed') { showError('Match is already completed'); return; }
    setActiveOverlay(null);
    setScoring(true);

    // Skip API for local matches — go straight to offline fallback
    if (!isLocalMatch) {
      try {
        const res = await MatchAPI.scorePoint(matchId, side, action);
        setMatchData(res.match);
        localStorage.setItem(matchId, JSON.stringify(res.match));
        if (res.matchCompleted)     showSuccess('Match Complete!');
        else if (res.gameCompleted) showSuccess('Game Complete!');
        setScoring(false);
        return;
      } catch {
        // Fall through to offline fallback
      }
    }

    // Offline fallback
    try {
      const scoreBeforePoint = [...(matchData.current_score || [0, 0])];
      const updated = localScorePoint(matchData, side);
      const pointScore: [number, number] = [
        scoreBeforePoint[0] + (side === 1 ? 1 : 0),
        scoreBeforePoint[1] + (side === 2 ? 1 : 0),
      ];
      updated.events = [
        ...(matchData.events || []),
        { type: 'point', side, action, score: pointScore, game: matchData.current_game || 1, timestamp: Date.now() },
      ];
      setMatchData(updated);
      localStorage.setItem(matchId, JSON.stringify(updated));
      if (updated.matchCompleted)     showSuccess('Match Complete!');
      else if (updated.gameCompleted) showSuccess('Game Complete!');
    } finally {
      setScoring(false);
    }
  };

  const handleUndo = async () => {
    if (!matchId || scoring) return;
    setScoring(true);
    if (!isLocalMatch) {
      try {
        const res = await MatchAPI.undo(matchId);
        setMatchData(res);
        localStorage.setItem(matchId, JSON.stringify(res));
        showSuccess('Point undone');
        setScoring(false);
        return;
      } catch {
        // Fall through to local fallback
      }
    }

    // Local fallback undo
    try {
      const events: any[] = matchData?.events || [];
      const score    = [...(matchData?.current_score || [0, 0])] as [number, number];
      const setsWon  = [...(matchData?.sets_won    || [0, 0])]   as [number, number];
      const lastPoint = [...events].reverse().find((e: any) => e.type === 'point');

      if (!lastPoint && score[0] === 0 && score[1] === 0) {
        showError('No points to undo');
        setScoring(false);
        return;
      }

      let updated: any;

      if (!lastPoint) {
        // No event log — just decrement the serving side's score
        const s = matchData.serving as 1 | 2 || 1;
        const newScore = [...score] as [number, number];
        if (newScore[s - 1] > 0) newScore[s - 1]--;
        updated = { ...matchData, current_score: newScore };
      } else {
        // Remove last point event
        const newEvents = [...events];
        const idx = newEvents.map((e: any) => e.timestamp).lastIndexOf(lastPoint.timestamp);
        if (idx !== -1) newEvents.splice(idx, 1);

        const prev = [...newEvents].reverse().find((e: any) => e.type === 'point');
        const gameScores = [...(matchData.game_scores || [])];
        let currentGame  = matchData.current_game || 1;
        let newSetsWon   = [...setsWon] as [number, number];

        if (prev && lastPoint.game > prev.game) {
          gameScores.pop();
          newSetsWon = [
            gameScores.filter((g: any) => g.winner === 1).length,
            gameScores.filter((g: any) => g.winner === 2).length,
          ];
          currentGame = prev.game;
        }

        updated = {
          ...matchData,
          events:        newEvents,
          current_score: prev ? [...prev.score] : [0, 0],
          sets_won:      prev ? newSetsWon : [0, 0],
          game_scores:   prev ? gameScores : [],
          current_game:  prev ? currentGame : 1,
          serving:       prev ? prev.side : 1,
          status:        'live',
          winner:        null,
        };
      }

      setMatchData(updated);
      localStorage.setItem(matchId, JSON.stringify(updated));
      showSuccess('Point undone');
    } finally {
      setScoring(false);
    }
  };

  const handleStart = async () => {
    if (!matchId) return;
    if (!isLocalMatch) {
      try {
        const res = await MatchAPI.start(matchId);
        setMatchData(res);
        localStorage.setItem(matchId, JSON.stringify(res));
        return;
      } catch {}
    }
    const updated = { ...matchData, status: 'live' };
    setMatchData(updated);
    localStorage.setItem(matchId, JSON.stringify(updated));
  };

  const handleEnd = async () => {
    if (!matchId || !confirm('End this match? The current leader will be declared the winner.')) return;
    if (!isLocalMatch) {
      try {
        const res = await MatchAPI.end(matchId);
        setMatchData(res);
        localStorage.setItem(matchId, JSON.stringify(res));
        showSuccess('Match ended!');
        return; // stay on page — winner banner will show
      } catch (err: any) {
        showError(err.message || 'Could not end match');
        return;
      }
    }
    const setsWon = matchData?.sets_won || [0, 0];
    const winner = setsWon[0] > setsWon[1] ? 1 : setsWon[1] > setsWon[0] ? 2 : null;
    const updated = { ...matchData, status: 'completed', winner };
    setMatchData(updated);
    localStorage.setItem(matchId, JSON.stringify(updated));
    showSuccess('Match ended!');
  };

  const getSideName = (side: 1 | 2): string => {
    if (!matchData?.players) return side === 1 ? 'Side A' : 'Side B';
    if ((matchData.match_type || 'singles') === 'singles') {
      const p = side === 1 ? matchData.players.p1 : matchData.players.p2;
      return p?.name || (side === 1 ? 'Athlete A' : 'Athlete B');
    }
    const team = side === 1 ? matchData.players.sideA : matchData.players.sideB;
    if (!Array.isArray(team)) return side === 1 ? 'Team A' : 'Team B';
    return team.map((p: any) => p?.name || 'Athlete').join(' / ');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-sky-500 h-10 w-10" />
    </div>
  );

  const score      = (matchData?.current_score as [number, number]) || [0, 0];
  const setsWon    = (matchData?.sets_won      as [number, number]) || [0, 0];
  const serving    = (matchData?.serving as 1 | 2)                  || 1;
  const isLive     = matchData?.status === 'live';
  const isDone     = matchData?.status === 'completed';
  const gameScores: any[] = matchData?.game_scores || [];
  const canControl = isCreator(matchData) || isLocalMatch;

  return (
    <div className="min-h-screen w-full bg-slate-50 pb-24 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 space-y-5 max-w-lg mx-auto w-full">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate('/broadcast/center')} variant="ghost"
            className="h-10 px-4 font-black text-[9px] uppercase tracking-widest border bg-white rounded-xl">
            <ChevronLeft className="mr-1 h-3 w-3" /> Exit
          </Button>
          <div className="flex items-center gap-2">
            {isDone
              ? <Trophy className="h-4 w-4 text-yellow-500" />
              : <div className={cn('h-2 w-2 rounded-full', isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-300')} />
            }
            <span className="text-[9px] font-black uppercase text-slate-400 max-w-[160px] truncate">
              {isDone ? 'Completed' : isLive ? 'Live' : 'Scheduled'}: {matchData?.name}
            </span>
          </div>
        </div>

        {/* Game history */}
        {gameScores.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {gameScores.map((g: any, i: number) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase">
                G{i + 1}: {g.scoreA}–{g.scoreB}
              </div>
            ))}
          </div>
        )}

        {/* Score panels */}
        <div className="flex flex-col gap-4">
          {([1, 2] as (1 | 2)[]).map(side => {
            const isServing = serving === side;
            const isWinner  = isDone && matchData?.winner === side;
            return (
              <div key={side} className={cn(
                'p-6 rounded-[2.5rem] border transition-all flex items-center justify-between shadow-xl relative overflow-hidden',
                isWinner          ? 'bg-yellow-50 border-yellow-400 scale-[1.02]' :
                isServing && isLive ? 'bg-white border-sky-500 scale-[1.02]' :
                'bg-white/50 border-slate-100 opacity-70'
              )}>
                {isWinner && <Trophy className="absolute right-4 top-4 h-12 w-12 text-yellow-400 opacity-10" />}
                <div className="space-y-2 flex-1 mr-4">
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center font-black text-white text-sm',
                    side === 1 ? 'bg-sky-500' : 'bg-[#0B1F3A]')}>
                    {side === 1 ? 'A' : 'B'}
                  </div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-black uppercase italic tracking-tighter leading-tight">{getSideName(side)}</h2>
                    {isServing && isLive && <span className="text-lg" title="Serving">🏸</span>}
                  </div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: Math.ceil((matchData?.total_sets || 3) / 2) }).map((_, i) => (
                      <div key={i} className={cn('h-2 w-2 rounded-full border',
                        i < setsWon[side - 1] ? 'bg-sky-500 border-sky-500' : 'bg-slate-100 border-slate-200')} />
                    ))}
                  </div>
                </div>
                <motion.span key={score[side - 1]} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  className={cn('text-7xl font-black font-mono tabular-nums leading-none',
                    side === 1 ? 'text-sky-600' : 'text-[#0B1F3A]')}>
                  {score[side - 1]}
                </motion.span>
              </div>
            );
          })}
        </div>

        {/* Start button — only creator */}
        {!isLive && !isDone && canControl && (
          <div className="space-y-3">
            {matchData?.scheduledAt && new Date(matchData.scheduledAt) > new Date() && (
              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-center space-y-1">
                <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">Scheduled For</p>
                <p className="font-black text-[#0B1F3A] text-sm">
                  {new Date(matchData.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  Match not eligible to start yet
                </p>
              </div>
            )}
            {(!matchData?.scheduledAt || new Date(matchData.scheduledAt) <= new Date()) && (
              <Button onClick={handleStart} className="w-full h-16 rounded-2xl bg-sky-500 text-white font-black text-lg uppercase">
                Start Match
              </Button>
            )}
          </div>
        )}

        {/* View-only message for non-creators */}
        {isLive && !canControl && (
          <div className="py-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase italic">👁 Watching live — only the match creator can score</p>
          </div>
        )}

        {/* Scoring buttons — only creator */}
        {isLive && canControl && (
          <div className="grid grid-cols-2 gap-4">
            {([1, 2] as (1 | 2)[]).map(side => (
              <div key={side} className="relative h-28">
                <Button onClick={() => setActiveOverlay(side)} disabled={scoring}
                  className={cn('w-full h-full rounded-[2.5rem] text-white font-black text-3xl shadow-2xl transition-transform active:scale-95',
                    side === 1 ? 'bg-sky-500' : 'bg-[#0B1F3A]')}>
                  {scoring ? <Loader2 className="animate-spin h-8 w-8" /> : '+1'}
                </Button>
                <AnimatePresence>
                  {activeOverlay === side && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute inset-0 z-50 bg-[#0B1F3A] rounded-[2.5rem] p-3 flex flex-col gap-2 border-2 border-sky-500/50">
                      <div className="flex justify-between items-center px-3">
                        <span className="text-[8px] font-black text-sky-400 uppercase">Point Type</span>
                        <X onClick={() => setActiveOverlay(null)} className="h-4 w-4 text-white/40 cursor-pointer" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        {[
                          { label: 'Smash', icon: Zap },
                          { label: 'Net',   icon: Target },
                          { label: 'Error', icon: AlertCircle, red: true },
                        ].map(({ label, icon: Icon, red }) => (
                          <button key={label} onClick={() => handlePoint(side, label)}
                            className={cn('rounded-2xl flex flex-col items-center justify-center gap-1', red ? 'bg-red-500/10' : 'bg-white/5')}>
                            <Icon className={cn('h-5 w-5', red ? 'text-red-500' : 'text-sky-400')} />
                            <span className="text-[7px] font-black text-white uppercase">{label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Winner banner */}
        {isDone && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-3xl p-6 text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-slate-700 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-2">
              ✓ Match Ended
            </div>
            <Trophy className="h-10 w-10 text-yellow-500 mx-auto" />
            <p className="font-black text-[#0B1F3A] text-lg uppercase italic">
              {getSideName(matchData.winner as 1 | 2)} Wins!
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {setsWon[0]}–{setsWon[1]} in games
            </p>
            <Button
              onClick={() => navigate('/smashed')}
              className="w-full h-11 rounded-2xl bg-[#0B1F3A] text-white font-black text-[10px] uppercase mt-2">
              View in Archive
            </Button>
          </div>
        )}

        {/* Bottom controls */}
        <div className="flex gap-4">
          <Button onClick={() => navigate('/smashed')} variant="outline"
            className="flex-1 h-14 rounded-2xl border-slate-200 font-black text-[10px] uppercase gap-2 bg-white">
            <ChevronLeft className="h-4 w-4" /> Archive
          </Button>
          {isLive && canControl && (
            <Button onClick={handleUndo} disabled={scoring} variant="outline"
              className="flex-1 h-14 rounded-2xl border-amber-100 text-amber-600 font-black text-[10px] uppercase gap-2 bg-white hover:bg-amber-50">
              ↩ Undo
            </Button>
          )}
          {!isDone && canControl && (
            <Button onClick={handleEnd} variant="outline"
              className="flex-1 h-14 rounded-2xl border-red-100 text-red-500 font-black text-[10px] uppercase gap-2 bg-white hover:bg-red-50">
              <StopCircle className="h-4 w-4" /> End
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default ScoringPage;
