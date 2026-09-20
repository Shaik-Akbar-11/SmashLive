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
      // Generate SmashID: SMA + last 2 digits of year + 4-digit sequential number
      const year = new Date().getFullYear().toString().slice(-2);
      const count = await User.countDocuments();
      const seq = String(count + 1).padStart(4, '0');
      const smashId = `SMA${year}${seq}`;

      user = new User({
        email:              cleanEmail,
        emailVerified:      true,
        name,
        gender,
        state,
        district,
        role:               'player',
        smashId,
        onboardingComplete: false,
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
    const cleanEmail = normalizeEmail(email);
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      throw new Error('No account found with this email. Please register first.');
    }

    // Mark email verified on login if not already
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    return buildProfile(user);
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
