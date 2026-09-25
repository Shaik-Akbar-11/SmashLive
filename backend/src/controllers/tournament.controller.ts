import { Request, Response } from 'express';
import { TournamentService } from '../services/tournament.service';

const ok  = (res: Response, data: any, status = 200) => res.status(status).json(data);
const err = (res: Response, e: any) => {
  const status = e.message?.includes('not found') ? 404 : 400;
  res.status(status).json({ message: e.message || 'Request failed' });
};

export const tournamentController = {

  async create(req: Request, res: Response) {
    try {
      const creatorId = (req as any).user?._id;
      ok(res, await TournamentService.createTournament({ ...req.body, creatorId }), 201);
    }
    catch (e) { err(res, e); }
  },

  async getAll(req: Request, res: Response) {
    try { ok(res, await TournamentService.getTournaments(req.query.status as string)); }
    catch (e) { err(res, e); }
  },

  async getById(req: Request, res: Response) {
    try { ok(res, await TournamentService.getTournamentById(req.params.id)); }
    catch (e) { err(res, e); }
  },

  async update(req: Request, res: Response) {
    try { ok(res, await TournamentService.updateTournament(req.params.id, req.body)); }
    catch (e) { err(res, e); }
  },

  async remove(req: Request, res: Response) {
    try { ok(res, await TournamentService.deleteTournament(req.params.id)); }
    catch (e) { err(res, e); }
  },

  // Registration
  async register(req: Request, res: Response) {
    try { ok(res, await TournamentService.registerParticipant(req.params.id, req.body), 201); }
    catch (e) { err(res, e); }
  },

  async getParticipants(req: Request, res: Response) {
    try { ok(res, await TournamentService.getParticipants(req.params.id)); }
    catch (e) { err(res, e); }
  },

  // Draw
  async generateDraw(req: Request, res: Response) {
    try { ok(res, await TournamentService.generateDraw(req.params.id)); }
    catch (e) { err(res, e); }
  },

  async getBracket(req: Request, res: Response) {
    try { ok(res, await TournamentService.getBracket(req.params.id)); }
    catch (e) { err(res, e); }
  },

  // Record result & advance bracket
  async recordResult(req: Request, res: Response) {
    try {
      const { bracketMatchId, winnerParticipantId } = req.body;
      if (!bracketMatchId || !winnerParticipantId) {
        return res.status(400).json({ message: 'bracketMatchId and winnerParticipantId are required' });
      }
      ok(res, await TournamentService.recordResult(req.params.id, bracketMatchId, winnerParticipantId));
    } catch (e) { err(res, e); }
  },

  // Tournament matches
  async getMatches(req: Request, res: Response) {
    try { ok(res, await TournamentService.getTournamentMatches(req.params.id)); }
    catch (e) { err(res, e); }
  },

  // Standings (round robin)
  async getStandings(req: Request, res: Response) {
    try { ok(res, await TournamentService.getStandings(req.params.id)); }
    catch (e) { err(res, e); }
  },

  // Close registration
  async closeRegistration(req: Request, res: Response) {
    try { ok(res, await TournamentService.closeRegistration(req.params.id)); }
    catch (e) { err(res, e); }
  },

  // Approve participant
  async approveParticipant(req: Request, res: Response) {
    try { ok(res, await TournamentService.approveParticipant(req.params.id, req.params.participantId)); }
    catch (e) { err(res, e); }
  },

  // Reject participant
  async rejectParticipant(req: Request, res: Response) {
    try { ok(res, await TournamentService.rejectParticipant(req.params.id, req.params.participantId)); }
    catch (e) { err(res, e); }
  },

  // Bye — participant forfeits their match; opponent advances
  async byeMatch(req: Request, res: Response) {
    try {
      const userId = (req as any).user?._id;
      ok(res, await TournamentService.byeMatch(req.params.id, req.params.matchId, String(userId)));
    } catch (e) { err(res, e); }
  },
};
