import express from 'express';
import { authController } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { sendOtpSchema, registerSchema, loginSchema } from '../validations/auth.validation';
import { User } from '../models/User';

const router = express.Router();

router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/profile', protect, authController.profile);
router.get('/whatsapp-status', authController.whatsappStatus);

// PATCH /api/auth/profile  — update own profile + complete onboarding
router.patch('/profile', protect, async (req: any, res) => {
  try {
    const allowed = ['name', 'gender', 'state', 'district', 'playingLevel', 'preferredCategory', 'age', 'onboardingComplete', 'club', 'university'];
    const update: any = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-__v').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
