import { MatchAPI } from './api';

export const MatchService = {
  async createMatch(matchData: any) {
    return MatchAPI.create(matchData);
  },

  async getLiveMatches() {
    return MatchAPI.getAll('live');
  },

  // Realtime is handled via Socket.IO on the backend
  subscribeToMatch(_matchId: string, _callback: (payload: any) => void) {
    return { unsubscribe: () => {} };
  },
};
