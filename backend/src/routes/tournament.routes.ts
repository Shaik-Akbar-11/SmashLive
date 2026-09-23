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
    // If no creatorId (legacy tournament), allow any authenticated user to manage it.
    // If creatorId is set, only the creator may proceed.
    if (t.creatorId && String(t.creatorId) !== String(req.user._id)) {
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

export default router;
