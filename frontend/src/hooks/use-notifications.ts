import { useSocketEvent } from './use-socket';
import { showSuccess } from '@/utils/toast';

function dispatch(message: string, type: string) {
  // Show toast
  showSuccess(message);
  // Add to notification bell
  window.dispatchEvent(new CustomEvent('smashlive:notification', {
    detail: { message, type }
  }));
}

export function useNotifications() {
  const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const myName = (savedProfile?.name || '').toLowerCase();

  // Match reminder — 30 min and 5 min before
  useSocketEvent('match:reminder', (payload: any) => {
    const players: string[] = (payload.players || []).map((n: string) => n.toLowerCase());
    if (!myName || !players.some(p => p.includes(myName) || myName.includes(p))) return;
    const mins = payload.minutesBefore || 30;
    dispatch(`⏰ "${payload.matchName}" starts in ${mins} minutes! Get ready.`, 'match_reminder');
  });

  // New match involving me
  useSocketEvent('feed:match_created', (match: any) => {
    const str = JSON.stringify(match.players || '').toLowerCase();
    if (myName && str.includes(myName)) {
      dispatch(`Your match "${match.name || 'New Match'}" has started!`, 'match_started');
    }
  });

  // Match I'm in completed
  useSocketEvent('feed:match_completed', (match: any) => {
    const str = JSON.stringify(match.players || '').toLowerCase();
    if (myName && str.includes(myName)) {
      const winner = match.winner === 1
        ? (match.players?.p1?.name || match.players?.sideA?.[0]?.name)
        : (match.players?.p2?.name || match.players?.sideB?.[0]?.name);
      dispatch(`Match complete! ${winner || 'Result'} wins 🏆`, 'match_completed');
    }
  });

  // Game/match complete during scoring
  useSocketEvent('feed:score_update', (payload: any) => {
    if (!myName) return;
    const str = JSON.stringify(payload.players || '').toLowerCase();
    if (!str.includes(myName)) return;
    const sc = payload.current_score;
    if (payload.gameCompleted && sc) {
      dispatch(`Game complete! Score: ${sc[0]}–${sc[1]}`, 'score');
    }
    if (payload.matchCompleted) {
      dispatch('Match finished! Check the scorecard.', 'match_completed');
    }
  });

  // Tournament next-round match ready
  useSocketEvent('tournament:next_match', (payload: any) => {
    const players: string[] = (payload.players || []).map((n: string) => n.toLowerCase());
    if (!myName || !players.some(p => p.includes(myName) || myName.includes(p))) return;
    const opponent = players.find(p => !p.includes(myName) && !myName.includes(p)) || 'your opponent';
    const location = payload.venue || payload.city ? ` · ${payload.venue || payload.city}` : '';
    const date = payload.date ? ` · ${payload.date}` : '';
    dispatch(
      `🏸 Next match: ${payload.round} vs ${opponent}${location}${date} — ${payload.tournamentName}`,
      'tournament_next_match'
    );
  });
}
