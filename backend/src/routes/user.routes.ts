import express, { Request, Response } from 'express';
import { User } from '../models/User';
import { Match } from '../models/Match';
import { Participant } from '../models/Participant';
import { getRankings, recalculateAllRankings } from '../services/ranking.service';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/users/rankings?scope=world&state=Maharashtra
router.get('/rankings', async (req: Request, res: Response) => {
  try {
    const scope = (req.query.scope as string) === 'state' ? 'state' : 'world';
    const state = req.query.state as string | undefined;
    const data  = await getRankings(scope, state);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/users/rankings/recalculate
router.post('/rankings/recalculate', async (req: Request, res: Response) => {
  try {
    await recalculateAllRankings();
    res.json({ message: 'Rankings recalculated' });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users/:id/stats — full profile stats + match history
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user: any;
    if (mongoose.isValidObjectId(id)) {
      user = await User.findById(id).select('-__v').lean();
    }
    if (!user) {
      user = await User.findOne({ mobile: id }).select('-__v').lean();
    }
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch matches involving this user (by mobile in players field)
    const allMatches = await Match.find({ status: 'completed' }).lean();
    const mobile = user.mobile;
    const name   = user.name?.toLowerCase();

    const myMatches = allMatches.filter(m => {
      const str = JSON.stringify(m.players || '').toLowerCase();
      return str.includes(mobile) || (name && str.includes(name));
    });

    // Match history items
    const matchHistory = myMatches.slice(0, 20).map(m => {
      const p = m.players as any;
      const isSideA = JSON.stringify(p?.p1 || p?.sideA || '').toLowerCase().includes(mobile)
        || JSON.stringify(p?.p1 || p?.sideA || '').toLowerCase().includes(name);
      const mySide  = isSideA ? 1 : 2;
      const won     = m.winner === mySide;
      const games   = (m as any).game_scores || [];
      return {
        _id:       m._id,
        name:      m.name,
        date:      m.updatedAt,
        match_type: m.match_type,
        category:   (m as any).category,
        opponent:   isSideA
          ? (p?.p2?.name || p?.sideB?.[0]?.name || 'Opponent')
          : (p?.p1?.name || p?.sideA?.[0]?.name || 'Opponent'),
        result:    won ? 'W' : 'L',
        score:     games.map((g: any) => `${g.scoreA}-${g.scoreB}`).join(', ') || '—',
        sets_won:  m.sets_won,
      };
    });

    // Tournament participations
    const participations = await Participant.find({
      $or: [
        { phone: mobile },
        { name: { $regex: new RegExp(`^${user.name}$`, 'i') } },
      ],
    }).populate('tournament_id').lean();

    // Smash/Net/Error counts from events
    let smashes = 0, nets = 0, errors = 0;
    myMatches.forEach(m => {
      ((m as any).events || []).forEach((e: any) => {
        const a = (e.action || '').toLowerCase();
        if (a === 'smash') smashes++;
        else if (a === 'net') nets++;
        else if (a === 'error') errors++;
      });
    });

    const winRate = user.matchesPlayed > 0
      ? Math.round((user.matchesWon / user.matchesPlayed) * 100)
      : 0;

    res.json({
      user,
      stats: {
        matchesPlayed:     user.matchesPlayed,
        matchesWon:        user.matchesWon,
        matchesLost:       user.matchesLost,
        winRate:           `${winRate}%`,
        rankingPoints:     user.rankingPoints,
        currentStreak:     user.currentStreak,
        tournamentsPlayed: user.tournamentsPlayed,
        tournamentsWon:    user.tournamentsWon,
        smashes,
        nets,
        errors,
      },
      matchHistory,
      tournaments: participations.map((p: any) => ({
        _id:    p.tournament_id?._id,
        name:   p.tournament_id?.name,
        status: p.tournament_id?.status,
        result: p.status,
        city:   p.tournament_id?.city,
        date:   p.tournament_id?.start_date,
      })).filter(t => t.name),
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .select('-__v')
      .sort({ rankingPoints: -1, createdAt: -1 })
      .lean();
    res.json(users);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users/:id — supports ObjectId, mobile, or smashId
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let user;
    if (mongoose.isValidObjectId(id)) {
      user = await User.findById(id).select('-__v').lean();
    }
    if (!user) {
      user = await User.findOne({
        $or: [{ mobile: id }, { smashId: id }]
      }).select('-__v').lean();
    }
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
