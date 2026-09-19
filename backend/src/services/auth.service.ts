import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { normalizeEmail } from './otp.service';

const generateToken = (id: string) => {
  return jwt.sign(
    { id },
    config.jwtSecret,
    { expiresIn: config.jwtExpire as `${number}${'s'|'m'|'h'|'d'|'w'|'y'}` | number }
  );
};

export const AuthService = {
  /**
   * Send-OTP pre-check: nothing here — response shape is identical for
   * known/unknown emails (account enumeration prevention).
   */

  /**
   * Called after OTP verification succeeds.
   * - Unknown email → create new user with role=player
   * - Known email   → update emailVerified if needed, preserve role
   * Never downgrades an existing admin.
   */
  async loginOrRegister({
    email,
    name,
    gender,
    state,
    district,
  }: {
    email: string;
    name?: string;
    gender?: string;
    state?: string;
    district?: string;
  }) {
    const cleanEmail = normalizeEmail(email);
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // New user — registration path
      if (!name) {
        throw new Error('Name is required for registration.');
      }
      const smashId = 'SMASH#' + Math.floor(1000 + Math.random() * 9000);
      user = new User({
        email:              cleanEmail,
        emailVerified:      true,
        name,
        gender,
        state,
        district,
        role:               'player',   // public registration always player
        smashId,
        onboardingComplete: true,
      });
      await user.save();
    } else {
      // Existing user — login path; mark email verified if not already
      if (!user.emailVerified) {
        user.emailVerified = true;
        await user.save();
      }
      // Never downgrade admin — role is preserved as-is
    }

    return buildProfile(user);
  },

  /**
   * @deprecated — kept so any legacy callers don't hard-crash during cutover.
   * Use loginOrRegister() for all new flows.
   */
  async register({
    name, email, gender, state, district,
  }: {
    name: string; email: string; gender?: string; state?: string; district?: string;
  }) {
    return this.loginOrRegister({ email, name, gender, state, district });
  },

  async login({ email }: { email: string }) {
    return this.loginOrRegister({ email });
  },

  async getProfile(userId: string) {
    const user = await User.findById(userId).select('-__v').lean();
    if (!user) throw new Error('User not found');
    return user;
  },
};

function buildProfile(user: InstanceType<typeof User>) {
  return {
    _id:                user._id,
    name:               user.name,
    email:              user.email,
    gender:             user.gender,
    state:              user.state,
    district:           user.district,
    role:               user.role,
    smashId:            user.smashId,
    onboardingComplete: user.onboardingComplete,
    token:              generateToken(user._id.toString()),
  };
}
