import express, { Request, Response } from 'express';
import { Entity } from '../models/Entity';

const router = express.Router();

const VALID_TYPES = ['city', 'venue', 'club', 'university'];

/**
 * GET /api/entities?type=city&q=mum
 * Returns matching entities. Requires at least 2 characters.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    const q    = (req.query.q as string || '').trim();

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Valid type is required: city | venue | club | university' });
    }
    if (q.length < 2) return res.json([]);

    const filter: any = {
      type,
      nameLower: { $regex: q.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
    };
    const results = await Entity.find(filter).sort({ name: 1 }).limit(10).lean();
    res.json(results);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * POST /api/entities
 * Create a new entity. Silently returns existing one if duplicate.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, name, state, city } = req.body;
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Valid type required' });
    }
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    const trimmed   = String(name).trim();
    const nameLower = trimmed.toLowerCase();

    // Return existing if found
    const existing = await Entity.findOne({ type, nameLower });
    if (existing) return res.json(existing);

    const entity = await Entity.create({ type, name: trimmed, nameLower, state, city });
    res.status(201).json(entity);
  } catch (err: any) {
    if (err.code === 11000) {
      // Race condition duplicate — just return it
      const found = await Entity.findOne({ type: req.body.type, nameLower: req.body.name?.toLowerCase().trim() });
      return res.json(found);
    }
    res.status(400).json({ message: err.message });
  }
});

export default router;
