import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendOtp, verifyOtp } from '../services/otp.service';

export const authController = {
  /**
   * POST /api/auth/send-otp
   * Sends an OTP to the given email address.
   * Returns identical status/body for known and unknown emails (enumeration prevention).
   */
  async sendOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;
      await sendOtp(email);
      // Identical response regardless of whether email exists
      res.json({ message: 'If that email is valid, an OTP has been sent.' });
    } catch (error: any) {
      // Canonical user-facing messages only
      const msg = error.message === 'Please wait before requesting another OTP.'
        ? error.message
        : 'Unable to send OTP. Please try again.';
      res.status(400).json({ message: msg });
    }
  },

  /**
   * POST /api/auth/register
   * Verifies OTP then creates a new user account.
   */
  async register(req: Request, res: Response) {
    try {
      const { name, email, otp, gender, state, district } = req.body;
      await verifyOtp(email, otp);
      const user = await AuthService.loginOrRegister({ email, name, gender, state, district });
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },

  /**
   * POST /api/auth/login
   * Verifies OTP then returns user profile + JWT.
   */
  async login(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      await verifyOtp(email, otp);
      const user = await AuthService.loginOrRegister({ email });
      res.json(user);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  },

  /**
   * GET /api/auth/profile  (JWT protected)
   */
  async profile(req: any, res: Response) {
    try {
      const user = await AuthService.getProfile(req.user._id.toString());
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  },
};
