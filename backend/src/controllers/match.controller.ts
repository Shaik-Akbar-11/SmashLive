import { Request, Response } from 'express';
import { MatchService } from '../services/match.service';
import { broadcastScoreUpdate, broadcastMatchComplete, broadcastMatchCreated } from '../sockets/match.socket';
import { updateRankingsForMatch } from '../services/ranking.service';

export const matchController = {

  async create(req: Request, res: Response) {
    try {
      const matchData = { ...req.body };
      // If user is logged in, store as creator
      if ((req as any).user?._id) {
        matchData.createdBy = (req as any).user._id;
      }
      const match = await MatchService.createMatch(matchData);
      const io = (req as any).app.get('io');
      if (io) {
        broadcastMatchCreated(io, match);
        // If created as live, also broadcast as started
        if (match.status === 'live') {
          io.to(String(match._id)).emit('match:started', match);
          io.emit('feed:match_started', match);
        }
      }
      res.status(201).json(match);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const status = req.query.status as string | undefined;
      const matches = await MatchService.getMatches(status);
      res.json(matches);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const match = await MatchService.getMatchById(req.params.id);
      res.json(match);
    } catch (err: any) {
      const status = err.message === 'Match not found' ? 404 : 400;
      res.status(status).json({ message: err.message });
    }
  },

  async start(req: Request, res: Response) {
    try {
      const match = await MatchService.startMatch(req.params.id);
      const io = (req as any).app.get('io');
      if (io) {
        io.to(req.params.id).emit('match:started', match);
        io.emit('feed:match_started', match);
      }
      res.json(match);
    } catch (err: any) {
      const status = err.message === 'Match not found' ? 404 : 400;
      res.status(status).json({ message: err.message });
    }
  },

  async scorePoint(req: Request, res: Response) {
    try {
      const side = Number(req.body.side) as 1 | 2;
      const action = req.body.action || 'point';

      if (!side) return res.status(400).json({ message: 'side is required (1 or 2)' });

      const { match, gameCompleted, matchCompleted } = await MatchService.scorePoint(req.params.id, side, action);
      const io = (req as any).app.get('io');

      if (io) {
        const payload = {
          matchId: String(match._id),
          name: match.name,
          players: match.players,
          match_type: match.match_type,
          current_score: match.current_score,
          sets_won: match.sets_won,
          current_game: match.current_game,
          game_scores: match.game_scores,
          serving: match.serving,
          status: match.status,
          winner: match.winner,
          gameCompleted,
          matchCompleted,
        };

        broadcastScoreUpdate(io, req.params.id, payload);

        if (matchCompleted) {
          broadcastMatchComplete(io, match);
          // Update rankings in background (non-blocking)
          updateRankingsForMatch(String(match._id)).catch(() => {});
        }
      }

      res.json({ match, gameCompleted, matchCompleted });
    } catch (err: any) {
      const status = err.message === 'Match not found' ? 404 : 400;
      res.status(status).json({ message: err.message });
    }
  },

  async undoPoint(req: Request, res: Response) {
    try {
      const match = await MatchService.undoPoint(req.params.id);
      const io = (req as any).app.get('io');
      if (io) {
        const payload = {
          matchId: String(match._id),
          name: match.name,
          players: match.players,
          match_type: match.match_type,
          current_score: match.current_score,
          sets_won: match.sets_won,
          current_game: match.current_game,
          game_scores: match.game_scores,
          serving: match.serving,
          status: match.status,
          winner: match.winner,
          gameCompleted: false,
          matchCompleted: false,
        };
        broadcastScoreUpdate(io, req.params.id, payload);
      }
      res.json(match);
    } catch (err: any) {
      const status = err.message === 'Match not found' ? 404 : 400;
      res.status(status).json({ message: err.message });
    }
  },

  async endMatch(req: Request, res: Response) {
    try {
      const match = await MatchService.endMatch(req.params.id);
      const io = (req as any).app.get('io');
      if (io) broadcastMatchComplete(io, match);
      updateRankingsForMatch(String(match._id)).catch(() => {});
      res.json(match);
    } catch (err: any) {
      const status = err.message === 'Match not found' ? 404 : 400;
      res.status(status).json({ message: err.message });
    }
  },
};
