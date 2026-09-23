import express from 'express';
import { matchController } from '../controllers/match.controller';
import { protect } from '../middlewares/auth.middleware';

const router = express.Router();

// Public — read only + create
router.get('/',    matchController.getAll);
router.get('/:id', matchController.getById);
router.post('/',   matchController.create);

// Scoring — requires JWT to prevent random people changing scores
router.post('/:id/start', protect, matchController.start);
router.post('/:id/score', protect, matchController.scorePoint);
router.post('/:id/undo',  protect, matchController.undoPoint);
router.post('/:id/end',   protect, matchController.endMatch);

// Temp admin delete — no auth, by ID only
router.delete('/admin/:id', async (req: any, res) => {
  try {
    const { Match } = await import('../models/Match');
    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// Delete — protected
router.delete('/:id', protect, async (req: any, res) => {
  try {
    const { Match } = await import('../models/Match');
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json({ message: 'Match deleted' });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
