import express, { Request, Response } from 'express';
import { User } from '../models/User';
import { Match } from '../models/Match';
import { Participant } from '../models/Participant';
import { getRankings, recalculateAllRankings } from '../services/ranking.service';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/users/rankings?scope=world|state|district&state=X&district=Y
router.get('/rankings', async (req: Request, res: Response) => {
  try {
    const scope    = req.query.scope as string || 'world';
    const state    = req.query.state    as string | undefined;
    const district = req.query.district as string | undefined;
    const data     = await getRankings(
      scope === 'district' ? 'state' : scope as 'world' | 'state',
      state,
      district
    );
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

// POST /api/users/migrate-smash-ids — one-time migration to SMA format
router.post('/migrate-smash-ids', async (req: Request, res: Response) => {
  try {
    const users = await User.find({}).lean();
    const year = new Date().getFullYear().toString().slice(-2);
    let updated = 0;
    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const id = (u as any).smashId || '';
      if (!id || !id.startsWith('SMA')) {
        const seq = String(i + 1).padStart(4, '0');
        const newId = `SMA${year}${seq}`;
        await User.findByIdAndUpdate(u._id, { smashId: newId });
        updated++;
      }
    }
    res.json({ message: `Migration complete. Updated ${updated} users.`, updated });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users/h2h?a=id1&b=id2 — head to head between two players
router.get('/h2h', async (req: Request, res: Response) => {
  try {
    const { a, b } = req.query as { a: string; b: string };
    if (!a || !b) return res.status(400).json({ message: 'Both player ids required' });

    const findUser = async (id: string) => {
      if (mongoose.isValidObjectId(id)) {
        const u = await User.findById(id).lean();
        if (u) return u;
      }
      return await User.findOne({ $or: [{ mobile: id }, { smashId: id }] }).lean();
    };

    const [userA, userB] = await Promise.all([findUser(a), findUser(b)]);
    if (!userA || !userB) return res.status(404).json({ message: 'One or both players not found' });

    const allMatches = await Match.find({ status: 'completed' }).lean();

    const h2hMatches = allMatches.filter(m => {
      const str = JSON.stringify(m.players || '').toLowerCase();
      const nameA = userA.name.toLowerCase();
      const nameB = userB.name.toLowerCase();
      const mobileA = userA.mobile;
      const mobileB = userB.mobile;
      const hasA = str.includes(mobileA) || str.includes(nameA);
      const hasB = str.includes(mobileB) || str.includes(nameB);
      return hasA && hasB;
    });

    let winsA = 0, winsB = 0;
    const matches = h2hMatches.map(m => {
      const p = m.players as any;
      const strA = JSON.stringify(p?.p1 || p?.sideA || '').toLowerCase();
      const isAonSide1 = strA.includes(userA.mobile) || strA.includes(userA.name.toLowerCase());
      const winner = m.winner === (isAonSide1 ? 1 : 2) ? 'A' : 'B';
      if (winner === 'A') winsA++; else winsB++;
      const games = (m as any).game_scores || [];
      return {
        _id: m._id,
        name: m.name,
        date: m.updatedAt,
        winner,
        score: games.map((g: any) => `${g.scoreA}-${g.scoreB}`).join(', ') || '—',
      };
    });

    res.json({
      playerA: { _id: userA._id, name: userA.name, smashId: userA.smashId, state: userA.state },
      playerB: { _id: userB._id, name: userB.name, smashId: userB.smashId, state: userB.state },
      winsA, winsB,
      total: h2hMatches.length,
      matches,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/users/:id/follow — toggle follow/unfollow
router.post('/:id/follow', async (req: any, res: Response) => {
  try {
    const targetId = req.params.id;
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Login required to follow' });

    const jwt = await import('jsonwebtoken');
    const { config } = await import('../config');
    const decoded: any = jwt.default.verify(auth.split(' ')[1], config.jwtSecret);
    const myId = decoded.id;

    if (String(myId) === String(targetId)) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const [me, target] = await Promise.all([
      User.findById(myId),
      User.findById(targetId),
    ]);

    if (!me || !target) return res.status(404).json({ message: 'User not found' });

    const alreadyFollowing = (me.following || []).some(id => String(id) === String(targetId));

    if (alreadyFollowing) {
      await User.findByIdAndUpdate(myId, { $pull: { following: target._id } });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: me._id } });
      const updated = await User.findById(targetId).lean();
      return res.json({ following: false, followersCount: (updated as any)?.followers?.length ?? 0 });
    } else {
      await User.findByIdAndUpdate(myId, { $addToSet: { following: target._id } });
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: me._id } });
      const updated = await User.findById(targetId).lean();
      return res.json({ following: true, followersCount: (updated as any)?.followers?.length ?? 0 });
    }
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'name smashId state avatar')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json((user as any).followers || []);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/users/:id/following
router.get('/:id/following', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('following', 'name smashId state avatar')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json((user as any).following || []);
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

    const allMatches = await Match.find({ status: 'completed' }).lean();
    const mobile = user.mobile;
    const name   = user.name?.toLowerCase();

    const myMatches = allMatches.filter(m => {
      const str = JSON.stringify(m.players || '').toLowerCase();
      return str.includes(mobile) || (name && str.includes(name));
    });

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

    const participations = await Participant.find({
      $or: [
        { phone: mobile },
        { name: { $regex: new RegExp(`^${user.name}$`, 'i') } },
      ],
    }).populate('tournament_id').lean();

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

    const computedPlayed = myMatches.length;
    const sortedMatches = myMatches.sort((a: any, b: any) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    const computedWon = sortedMatches.filter(m => {
      const p = m.players as any;
      const isSideA = JSON.stringify(p?.p1 || p?.sideA || '').toLowerCase().includes(mobile)
        || JSON.stringify(p?.p1 || p?.sideA || '').toLowerCase().includes(name);
      return m.winner === (isSideA ? 1 : 2);
    }).length;
    const computedLost = computedPlayed - computedWon;
    const computedWinRate = computedPlayed > 0
      ? Math.round((computedWon / computedPlayed) * 100)
      : 0;

    let computedStreak = 0;
    for (const m of sortedMatches) {
      const p = m.players as any;
      const isSideA = JSON.stringify(p?.p1 || p?.sideA || '').toLowerCase().includes(mobile)
        || JSON.stringify(p?.p1 || p?.sideA || '').toLowerCase().includes(name);
      const won = m.winner === (isSideA ? 1 : 2);
      if (computedStreak === 0) {
        computedStreak = won ? 1 : -1;
      } else if (won && computedStreak > 0) {
        computedStreak++;
      } else if (!won && computedStreak < 0) {
        computedStreak--;
      } else {
        break;
      }
    }

    res.json({
      user,
      stats: {
        matchesPlayed:     Math.max(user.matchesPlayed, computedPlayed),
        matchesWon:        Math.max(user.matchesWon, computedWon),
        matchesLost:       Math.max(user.matchesLost, computedLost),
        winRate:           `${Math.max(winRate, computedWinRate)}%`,
        rankingPoints:     user.rankingPoints,
        currentStreak:     computedStreak || user.currentStreak,
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
