import express, { Request, Response } from 'express';
import { User } from '../models/User';
import { Match } from '../models/Match';
import { Tournament } from '../models/Tournament';
import { Entity } from '../models/Entity';

const router = express.Router();

const MAX_PER_TYPE = 5;

/**
 * GET /api/search?q=akbar
 * Returns grouped search results across players, matches, tournaments, and entities.
 * Minimum 2 characters. No auth required — returns only public fields.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (q.length < 2) return res.json({ players: [], matches: [], tournaments: [], entities: [] });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [players, matches, tournaments, entities] = await Promise.all([
      // Players — search by name, smashId, state, district, club, university
      User.find({
        role: { $in: ['player', 'admin', 'referee'] },
        $or: [
          { name: regex },
          { smashId: regex },
          { state: regex },
          { district: regex },
          { club: regex },
          { university: regex },
        ],
      })
        .select('_id name smashId state district club university rankingPoints matchesPlayed')
        .sort({ rankingPoints: -1 })
        .limit(MAX_PER_TYPE)
        .lean(),

      // Matches — search by name, player names
      Match.find({
        $or: [
          { name: regex },
          { 'players.p1.name': regex },
          { 'players.p2.name': regex },
          { 'players.sideA.0.name': regex },
          { 'players.sideB.0.name': regex },
          { court: regex },
        ],
      })
        .select('_id name status players current_score sets_won scheduledAt createdAt match_type')
        .sort({ createdAt: -1 })
        .limit(MAX_PER_TYPE)
        .lean(),

      // Tournaments — search by name, city, venue, organizer
      Tournament.find({
        $or: [
          { name: regex },
          { city: regex },
          { venue: regex },
          { organizer: regex },
        ],
      })
        .select('_id name status city venue start_date category')
        .sort({ createdAt: -1 })
        .limit(MAX_PER_TYPE)
        .lean(),

      // Entities (venues, cities, clubs, universities)
      Entity.find({ name: regex })
        .select('_id type name state city')
        .sort({ type: 1, name: 1 })
        .limit(MAX_PER_TYPE * 2)
        .lean(),
    ]);

    res.json({ players, matches, tournaments, entities });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
