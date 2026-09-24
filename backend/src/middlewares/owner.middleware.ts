import { Request, Response, NextFunction } from 'express';
import { Match } from '../models/Match';
import { Tournament } from '../models/Tournament';

/**
 * Middleware to check if the logged-in user created this match.
 * Must be used after `protect` middleware.
 */
export const matchOwner = async (req: any, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id).lean();
    if (!match) return res.status(404).json({ message: 'Match not found' });

    // If match has no createdBy (legacy), allow any logged-in user
    if (!(match as any).createdBy) return next();

    if (String((match as any).createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the match creator can perform this action' });
    }
    next();
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Middleware to check if the logged-in user created this tournament.
 */
export const tournamentOwner = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id).lean();
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    if (!(tournament as any).createdBy) return next();

    if (String((tournament as any).createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the tournament creator can perform this action' });
    }
    next();
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
