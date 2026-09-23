import { useEffect } from 'react';
import { useSocketEvent } from './use-socket';
import { showSuccess } from '@/utils/toast';

/**
 * Global in-app notifications via Socket.IO events.
 * Mount this once at the app level.
 */
export function useNotifications() {
  const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const myName = (savedProfile?.name || '').toLowerCase();

  // Match reminder — 30 min and 5 min before
  useSocketEvent('match:reminder', (payload: any) => {
    const players: string[] = (payload.players || []).map((n: string) => n.toLowerCase());
    if (!myName || !players.some(p => p.includes(myName) || myName.includes(p))) return;
    const mins = payload.minutesBefore || 30;
    showSuccess(`⏰ "${payload.matchName}" starts in ${mins} minutes! Get ready.`);
  });

  // New match involving me
  useSocketEvent('feed:match_created', (match: any) => {
    const str = JSON.stringify(match.players || '').toLowerCase();
    if (myName && str.includes(myName)) {
      showSuccess(`Your match "${match.name || 'New Match'}" has started!`);
    }
  });

  // Match I'm in completed
  useSocketEvent('feed:match_completed', (match: any) => {
    const str = JSON.stringify(match.players || '').toLowerCase();
    if (myName && str.includes(myName)) {
      const winner = match.winner === 1
        ? (match.players?.p1?.name || match.players?.sideA?.[0]?.name)
        : (match.players?.p2?.name || match.players?.sideB?.[0]?.name);
      showSuccess(`Match complete! ${winner || 'Result'} wins 🏆`);
    }
  });

  // Score update for matches I'm in
  useSocketEvent('feed:score_update', (payload: any) => {
    if (!myName) return;
    const str = JSON.stringify(payload.players || '').toLowerCase();
    if (!str.includes(myName)) return;
    const sc = payload.current_score;
    if (payload.gameCompleted && sc) {
      showSuccess(`Game complete! Score: ${sc[0]}–${sc[1]}`);
    }
    if (payload.matchCompleted) {
      showSuccess('Match finished! Check the scorecard.');
    }
  });
}
