import express, { Request, Response, NextFunction } from 'express';
import { tournamentController } from '../controllers/tournament.controller';
import { protect } from '../middlewares/auth.middleware';
import { Tournament } from '../models/Tournament';

const router = express.Router();

// ── Creator-only guard ────────────────────────────────────────────────────────
// Attaches to any route that needs to verify the requester is the tournament creator.
const requireCreator = async (req: any, res: Response, next: NextFunction) => {
  try {
    const t = await Tournament.findById(req.params.id).select('creatorId').lean();
    if (!t) return res.status(404).json({ message: 'Tournament not found' });
    if (!t.creatorId) {
      return res.status(403).json({ message: 'Only the tournament creator can perform this action' });
    }
    if (String(t.creatorId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the tournament creator can perform this action' });
    }
    next();
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/',    tournamentController.getAll);
router.get('/:id', tournamentController.getById);

// ── Participants (public POST — anyone with link can register) ────────────────
router.get ('/:id/participants', tournamentController.getParticipants);
router.post('/:id/participants', tournamentController.register);

// ── Bracket & standings (public) ─────────────────────────────────────────────
router.get('/:id/bracket',   tournamentController.getBracket);
router.get('/:id/matches',   tournamentController.getMatches);
router.get('/:id/standings', tournamentController.getStandings);

// ── Creator-only management ───────────────────────────────────────────────────
router.post  ('/',    protect, tournamentController.create);          // create — stores creatorId
router.patch ('/:id', protect, requireCreator, tournamentController.update);
router.delete('/:id', protect, requireCreator, tournamentController.remove);

router.post('/:id/draw',               protect, requireCreator, tournamentController.generateDraw);
router.post('/:id/result',             protect, requireCreator, tournamentController.recordResult);
router.post('/:id/close-registration', protect, requireCreator, tournamentController.closeRegistration);
router.patch('/:id/participants/:participantId/approve', protect, requireCreator, tournamentController.approveParticipant);
router.patch('/:id/participants/:participantId/reject',  protect, requireCreator, tournamentController.rejectParticipant);

// POST /:id/bracket/:matchId/bye — participant forfeits; opponent advances (auth required)
router.post('/:id/bracket/:matchId/bye', protect, tournamentController.byeMatch);

// POST /:id/bracket/:matchId/schedule — creator schedules a bracket match
router.post('/:id/bracket/:matchId/schedule', protect, requireCreator, async (req: any, res) => {
  try {
    const { scheduledAt, court } = req.body;
    if (!scheduledAt) return res.status(400).json({ message: 'scheduledAt is required' });

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const bracket = tournament.bracket as any[];
    const slot = bracket.find(m => String(m._id) === req.params.matchId);
    if (!slot) return res.status(404).json({ message: 'Bracket match not found' });
    if (!slot.participantA || !slot.participantB) {
      return res.status(400).json({ message: 'Cannot schedule — participants not yet determined' });
    }

    slot.scheduledAt = new Date(scheduledAt);
    if (court) slot.court = court;

    // Create or update a linked Match document so it appears in the matches feed
    const { Participant } = await import('../models/Participant');
    const { Match } = await import('../models/Match');

    const pA = await Participant.findById(slot.participantA).lean();
    const pB = await Participant.findById(slot.participantB).lean();

    const matchData = {
      name: `${tournament.name} — R${slot.round} M${slot.matchIndex + 1}`,
      players: { p1: { name: pA?.name || 'TBD' }, p2: { name: pB?.name || 'TBD' } },
      match_type: tournament.category === 'doubles' ? 'doubles' : 'singles',
      category: 'competitive',
      tournamentId: tournament._id,
      scheduledAt: new Date(scheduledAt),
      court: court || undefined,
      createdBy: req.user._id,
      status: 'scheduled',
      current_score: [0, 0],
      sets_won: [0, 0],
      game_scores: [],
      current_game: 1,
      serving: 1,
    };

    let linkedMatch: any;
    if (slot.matchId) {
      linkedMatch = await Match.findByIdAndUpdate(slot.matchId, { scheduledAt: new Date(scheduledAt), court }, { new: true });
    } else {
      linkedMatch = await Match.create(matchData);
      slot.matchId = linkedMatch._id;
    }

    tournament.markModified('bracket');
    await tournament.save();

    res.json({ message: 'Match scheduled', match: linkedMatch, slot });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
