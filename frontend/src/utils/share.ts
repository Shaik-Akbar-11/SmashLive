/**
 * Share utilities for matches, profiles and scorecards
 */

export function shareViaWhatsApp(text: string) {
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}

export function shareLiveMatch(matchName: string, score: [number, number], p1: string, p2: string, matchId: string) {
  const url = `${window.location.origin}/broadcast/${matchId}`;
  const text = `🏸 LIVE: ${matchName}\n${p1} ${score[0]} - ${score[1]} ${p2}\nWatch live: ${url}`;
  shareViaWhatsApp(text);
}

export function shareScorecard(matchName: string, p1: string, p2: string, setsWon: [number, number], gameScores: {scoreA: number, scoreB: number}[], matchId: string) {
  const url = `${window.location.origin}/match/${matchId}`;
  const games = gameScores.map((g, i) => `Game ${i+1}: ${g.scoreA}-${g.scoreB}`).join(' | ');
  const text = `🏸 Match Result: ${matchName}\n${p1} ${setsWon[0]} - ${setsWon[1]} ${p2}\n${games}\nFull scorecard: ${url}`;
  shareViaWhatsApp(text);
}

export function sharePlayerProfile(name: string, smashId: string, userId: string) {
  const url = `${window.location.origin}/player/${userId}`;
  const text = `Check out ${name}'s badminton profile on SmashLive!\n${smashId}\n${url}`;
  shareViaWhatsApp(text);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
