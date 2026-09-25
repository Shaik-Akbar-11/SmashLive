import React from 'react';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface BracketSlot {
  _id: string;
  round: number;
  matchIndex: number;
  participantA?: any;
  participantB?: any;
  winner?: any;
  status: string;
  scoreA?: number[];
  scoreB?: number[];
}

interface Props {
  bracket: BracketSlot[];
  onResult?: (matchId: string, winnerId: string) => void;
  onBye?: (matchId: string) => void;
  currentParticipantId?: string; // the logged-in user's participant _id in this tournament
}

function roundLabel(round: number, totalRounds: number): string {
  const diff = totalRounds - round;
  if (diff === 0) return 'Final';
  if (diff === 1) return 'Semi Final';
  if (diff === 2) return 'Quarter Final';
  return `Round ${round}`;
}

function getName(p: any): string {
  if (!p) return 'TBD';
  return p.name || p.partner_name ? `${p.name}` : 'TBD';
}

const MatchCard = ({
  match, onResult, onBye, currentParticipantId, isLast
}: {
  match: BracketSlot;
  onResult?: (matchId: string, winnerId: string) => void;
  onBye?: (matchId: string) => void;
  currentParticipantId?: string;
  isLast: boolean;
}) => {
  const pA = match.participantA;
  const pB = match.participantB;
  const winnerId = match.winner ? String(match.winner._id || match.winner) : null;
  const pAId = pA ? String(pA._id || pA) : null;
  const pBId = pB ? String(pB._id || pB) : null;
  const isDone = match.status === 'completed' || match.status === 'bye';
  const canScore = !isDone && pA && pB && onResult;

  // Show BYE button only to the player who is IN this match and it's not done
  const isMyMatch = !isDone && currentParticipantId && (
    pAId === currentParticipantId || pBId === currentParticipantId
  );
  const canBye = isMyMatch && !!onBye;

  return (
    <div className="relative flex flex-col items-start gap-1">
      {/* Match card */}
      <div className={cn(
        'w-44 rounded-2xl overflow-hidden border shadow-sm bg-white',
        isDone ? 'border-slate-100 opacity-90' : 'border-sky-200'
      )}>
        {/* Side A */}
        <div className={cn(
          'px-3 py-2.5 flex items-center justify-between gap-2 border-b',
          winnerId === pAId ? 'bg-sky-50 border-sky-100' : 'border-slate-50'
        )}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {winnerId === pAId && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
            <span className={cn(
              'text-[10px] font-black uppercase truncate',
              winnerId === pAId ? 'text-sky-600' : pA ? 'text-[#0B1F3A]' : 'text-slate-300'
            )}>
              {getName(pA)}
            </span>
          </div>
          {canScore && (
            <button
              onClick={() => onResult!(String(match._id), pAId!)}
              className="text-[7px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-md shrink-0 hover:bg-sky-600"
            >
              WIN
            </button>
          )}
        </div>
        {/* Side B */}
        <div className={cn(
          'px-3 py-2.5 flex items-center justify-between gap-2',
          winnerId === pBId ? 'bg-sky-50' : ''
        )}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {winnerId === pBId && <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />}
            <span className={cn(
              'text-[10px] font-black uppercase truncate',
              winnerId === pBId ? 'text-sky-600' : pB ? 'text-[#0B1F3A]' : 'text-slate-300'
            )}>
              {getName(pB)}
            </span>
          </div>
          {canScore && (
            <button
              onClick={() => onResult!(String(match._id), pBId!)}
              className="text-[7px] font-black bg-sky-500 text-white px-1.5 py-0.5 rounded-md shrink-0 hover:bg-sky-600"
            >
              WIN
            </button>
          )}
        </div>
      </div>

      {/* BYE button — only for the player whose match this is */}
      {canBye && (
        <button
          onClick={() => {
            if (confirm('Give a Bye? Your opponent will be declared the winner and advance. This cannot be undone.')) {
              onBye!(String(match._id));
            }
          }}
          className="w-44 text-[8px] font-black text-red-400 border border-red-100 bg-red-50 hover:bg-red-100 rounded-xl py-1.5 uppercase tracking-widest transition"
        >
          🚫 Give Bye (Forfeit)
        </button>
      )}

      {/* Connector line to next round */}
      {!isLast && (
        <div className="absolute left-full top-0 bottom-0 w-8 pointer-events-none">
          <svg width="32" height="100%" className="overflow-visible">
            <line x1="0" y1="50%" x2="32" y2="50%" stroke="#e2e8f0" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
};

const BracketTree: React.FC<Props> = ({ bracket, onResult, onBye, currentParticipantId }) => {
  if (!bracket || bracket.length === 0) return null;

  const rounds = [...new Set(bracket.map(m => m.round))].sort((a, b) => a - b);
  const maxRound = Math.max(...rounds);

  return (
    <div className="overflow-x-auto pb-4 -mx-2 px-2">
      <div className="flex gap-0 min-w-max">
        {rounds.map((round, roundIdx) => {
          const matches = bracket
            .filter(m => m.round === round)
            .sort((a, b) => a.matchIndex - b.matchIndex);

          const isLastRound = round === maxRound;

          // Spacing: each subsequent round doubles the vertical gap
          const totalSlots = Math.pow(2, maxRound - round);
          const slotHeight = 88; // px per match slot in first round
          const roundHeight = totalSlots * slotHeight;

          return (
            <div key={round} className="flex flex-col" style={{ marginRight: isLastRound ? 0 : 32 }}>
              {/* Round label */}
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 text-center mb-4 w-44">
                {roundLabel(round, maxRound)}
              </p>

              {/* Match cards with equal spacing */}
              <div
                className="flex flex-col justify-around"
                style={{ minHeight: roundHeight }}
              >
                {matches.map((match, idx) => (
                  <div key={String(match._id)} className="flex items-center relative">
                    {/* Left connector from previous round */}
                    {round > 1 && (
                      <div className="absolute right-full top-0 bottom-0 w-8 pointer-events-none" />
                    )}
                    <MatchCard
                      match={match}
                      onResult={onResult}
                      onBye={onBye}
                      currentParticipantId={currentParticipantId}
                      isLast={isLastRound}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BracketTree;
