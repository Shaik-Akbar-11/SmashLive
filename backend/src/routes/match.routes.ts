import express from 'express';
import jwt from 'jsonwebtoken';
import { matchController } from '../controllers/match.controller';
import { protect } from '../middlewares/auth.middleware';
import { matchOwner } from '../middlewares/owner.middleware';
import { User } from '../models/User';
import { config } from '../config';

const router = express.Router();

// Optional auth — sets req.user if token present, never blocks
const optionalProtect = async (req: any, _res: any, next: any) => {
  try {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      const decoded: any = jwt.verify(token, config.jwtSecret);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {}
  next();
};

// Public — read + create (optional auth saves creator)
router.get('/',    matchController.getAll);
router.get('/:id', matchController.getById);
router.post('/',   optionalProtect, matchController.create);

// Scoring — requires JWT + must be match creator
router.post('/:id/start', protect, matchOwner, matchController.start);
router.post('/:id/score', protect, matchOwner, matchController.scorePoint);
router.post('/:id/undo',  protect, matchOwner, matchController.undoPoint);
router.post('/:id/end',   protect, matchOwner, matchController.endMatch);

// Delete — protected (creator or admin)
router.delete('/:id', protect, matchOwner, async (req: any, res) => {
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
