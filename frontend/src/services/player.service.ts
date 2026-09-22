import { UserAPI } from './api';

export const PlayerService = {
  async getPlayerBySmashId(smashId: string) {
    return UserAPI.getById(smashId);
  },

  async getMatchHistory(playerId: string) {
    const result = await UserAPI.getStats(playerId);
    return result.matchHistory || [];
  },
};
