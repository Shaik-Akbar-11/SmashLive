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

// Always read fresh from localStorage so we never use a stale name
function getMyName(): string {
  try {
    const p = JSON.parse(localStorage.getItem('userProfile') || '{}');
    return (p?.name || '').toLowerCase().trim();
  } catch {
    return '';
  }
}

function isMe(str: string): boolean {
  const name = getMyName();
  if (!name) return false;
  return str.toLowerCase().includes(name);
}

function playerListIncludesMe(players: string[]): boolean {
  const name = getMyName();
  if (!name) return false;
  return players.some(p => p.toLowerCase().includes(name) || name.includes(p.toLowerCase()));
}

export function useNotifications() {
  // Match reminder — 30 min, 5 min before, and time-up alert
  useSocketEvent('match:reminder', (payload: any) => {
    const players: string[] = payload.players || [];
    if (!playerListIncludesMe(players)) return;
    dispatch(payload.message || `⏰ "${payload.matchName}" starts in ${payload.minutesBefore || 30} minutes!`, 'match_reminder');
  });

  // New match involving me
  useSocketEvent('feed:match_created', (match: any) => {
    const str = JSON.stringify(match.players || '');
    if (!isMe(str)) return;
    dispatch(`Your match "${match.name || 'New Match'}" has started!`, 'match_started');
  });

  // Match I'm in completed
  useSocketEvent('feed:match_completed', (match: any) => {
    const str = JSON.stringify(match.players || '');
    if (!isMe(str)) return;
    const winner = match.winner === 1
      ? (match.players?.p1?.name || match.players?.sideA?.[0]?.name)
      : (match.players?.p2?.name || match.players?.sideB?.[0]?.name);
    dispatch(`Match complete! ${winner || 'Result'} wins 🏆`, 'match_completed');
  });

  // Game/match complete during scoring
  useSocketEvent('feed:score_update', (payload: any) => {
    const str = JSON.stringify(payload.players || '');
    if (!isMe(str)) return;
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
    const players: string[] = payload.players || [];
    if (!playerListIncludesMe(players)) return;

    if (payload.forfeit) {
      dispatch(`✅ Opponent forfeited — you advance in ${payload.tournamentName}!`, 'tournament_next_match');
      return;
    }

    const myName = getMyName();
    const opponent = players.find(p => !p.toLowerCase().includes(myName) && !myName.includes(p.toLowerCase())) || 'your opponent';
    const location = payload.venue || payload.city ? ` · ${payload.venue || payload.city}` : '';
    const date = payload.date ? ` · ${payload.date}` : '';
    dispatch(
      `🏸 Next match: ${payload.round} vs ${opponent}${location}${date} — ${payload.tournamentName}`,
      'tournament_next_match'
    );
  });
}
