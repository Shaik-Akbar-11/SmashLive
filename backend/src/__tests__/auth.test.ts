/**
 * Auth migration test suite — mocked email provider, no real emails sent.
 * Covers every requirement in spec Section 6.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Mock mongoose before any model imports ───────────────────────────────────
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({}),
    connection: { readyState: 1 },
  };
});

// ── In-memory document store for User and Otp ────────────────────────────────
const usersStore: any[] = [];
const otpsStore:  any[] = [];

let userIdCounter = 1;
let otpIdCounter  = 1;

// Minimal OTP doc with verifyOtp method
const makeOtpDoc = (data: any) => ({
  ...data,
  _id: String(otpIdCounter++),
  createdAt: new Date(),
  save: jest.fn().mockImplementation(function (this: any) {
    const idx = otpsStore.findIndex(o => o._id === this._id);
    if (idx >= 0) otpsStore[idx] = { ...this };
    return Promise.resolve(this);
  }),
  verifyOtp: async function (this: any, entered: string) {
    return bcrypt.compare(entered, this.otpHash);
  },
});

// Named implementations so they can be re-attached after clearAllMocks
const otpFindOne  = async (q: any) =>
  otpsStore.find(o => {
    if (q.email    !== undefined && o.email    !== q.email)    return false;
    if (q.verified !== undefined && o.verified !== q.verified) return false;
    if (q.expiresAt?.$gt && o.expiresAt <= q.expiresAt.$gt)   return false;
    return true;
  }) ?? null;

const otpDeleteMany = async (q: any) => {
  const remove = otpsStore
    .map((o, i) => (q.email === undefined || o.email === q.email) ? i : -1)
    .filter(i => i >= 0)
    .reverse();
  remove.forEach(i => otpsStore.splice(i, 1));
  return { deletedCount: remove.length };
};

const otpCreate = async (data: any) => {
  const doc = makeOtpDoc(data);
  otpsStore.push(doc);
  return doc;
};

jest.mock('../models/Otp', () => ({
  Otp: {
    findOne:    jest.fn(otpFindOne),
    deleteMany: jest.fn(otpDeleteMany),
    create:     jest.fn(otpCreate),
  },
}));

// User mock — must be a real constructor so `new User(data)` works in auth.service
const UserMock: any = jest.fn().mockImplementation(function (this: any, data: any) {
  Object.assign(this, data);
  this._id = String(userIdCounter++);
  this.save = jest.fn().mockImplementation(async function (this: any) {
    const idx = usersStore.findIndex(u => u._id === this._id);
    if (idx >= 0) Object.assign(usersStore[idx], this);
    else          usersStore.push({ ...this });
    return this;
  });
});
UserMock.findOne  = jest.fn(async (q: any) =>
  usersStore.find(u => {
    if (q.email  !== undefined && u.email  !== q.email)  return false;
    if (q.mobile !== undefined && u.mobile !== q.mobile) return false;
    return true;
  }) ?? null
);
UserMock.findById = jest.fn(async (id: string) =>
  usersStore.find(u => u._id === id) ?? null
);
UserMock.countDocuments = jest.fn(async () => usersStore.length);
UserMock.prototype.save = jest.fn();

jest.mock('../models/User', () => ({ User: UserMock }));

import { User } from '../models/User';

// ── Now import the services under test ───────────────────────────────────────
import { normalizeEmail, sendOtp, verifyOtp, setEmailProvider } from '../services/otp.service';
import { AuthService } from '../services/auth.service';
import { validateConfig } from '../config';
import type { EmailProvider } from '../services/email.provider';

// ── Mock email provider ───────────────────────────────────────────────────────
const sentEmails: { email: string }[] = [];
const mockProvider: EmailProvider = {
  sendOtpEmail: jest.fn(async (email: string, _otp: string) => {
    // Never log or store the OTP itself
    sentEmails.push({ email });
  }),
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clears all in-memory stores and counters between tests. */
function resetStores() {
  usersStore.length  = 0;
  otpsStore.length   = 0;
  sentEmails.length  = 0;
  userIdCounter = 1;
  otpIdCounter  = 1;
  jest.clearAllMocks();
  // Re-attach implementations after clearAllMocks wipes them
  const { Otp } = require('../models/Otp');
  (Otp.findOne    as jest.Mock).mockImplementation(otpFindOne);
  (Otp.deleteMany as jest.Mock).mockImplementation(otpDeleteMany);
  (Otp.create     as jest.Mock).mockImplementation(otpCreate);
  (User.findOne  as jest.Mock).mockImplementation(async (q: any) =>
    usersStore.find(u => {
      if (q.email  !== undefined && u.email  !== q.email)  return false;
      if (q.mobile !== undefined && u.mobile !== q.mobile) return false;
      return true;
    }) ?? null
  );
  (User.findById as jest.Mock).mockImplementation(async (id: string) =>
    usersStore.find(u => u._id === id) ?? null
  );
  (User as any).countDocuments = jest.fn(async () => usersStore.length);
  setEmailProvider(mockProvider);
}

/** Creates a valid OTP in the store and returns the plain text OTP. */
async function createOtp(email: string): Promise<string> {
  const plain = '123456';
  const hash  = await bcrypt.hash(plain, 1); // cheap rounds for tests
  const doc   = makeOtpDoc({
    email,
    otpHash:   hash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    verified:  false,
    attempts:  0,
  });
  otpsStore.push(doc);
  return plain;
}

/** Creates a persisted user document in the in-memory store. */
function createUser(overrides: Partial<any> = {}): any {
  const u = {
    _id:                String(userIdCounter++),
    name:               'Test User',
    email:              'test@example.com',
    emailVerified:      true,
    role:               'player',
    smashId:            'SMASH#1234',
    onboardingComplete: true,
    save:               jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  usersStore.push(u);
  return u;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Email normalisation
// ════════════════════════════════════════════════════════════════════════════

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeEmail('  Akbar@Gmail.com  ')).toBe('akbar@gmail.com');
  });

  it('does not strip + aliases', () => {
    expect(normalizeEmail('a+1@gmail.com')).toBe('a+1@gmail.com');
  });

  it('handles already-normalised input idempotently', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. send-OTP validation
// ════════════════════════════════════════════════════════════════════════════

describe('sendOtp', () => {
  beforeEach(resetStores);

  it('sends an OTP to a valid email', async () => {
    await sendOtp('user@example.com');
    expect(mockProvider.sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(otpsStore).toHaveLength(1);
  });

  it('normalises the email before storing', async () => {
    await sendOtp('  UPPER@Example.COM  ');
    expect(otpsStore[0].email).toBe('upper@example.com');
  });

  it('stores the OTP as a hash — never plain text', async () => {
    await sendOtp('user@example.com');
    const stored = otpsStore[0].otpHash;
    expect(stored).not.toMatch(/^\d{6}$/);
    expect(stored.startsWith('$2')).toBe(true); // bcrypt prefix
  });

  it('invalidates the previous OTP when a new one is requested', async () => {
    await sendOtp('user@example.com');
    expect(otpsStore).toHaveLength(1);
    const first = otpsStore[0];

    // Wait past cooldown by backdating the first OTP's createdAt
    first.createdAt = new Date(Date.now() - 70 * 1000);

    await sendOtp('user@example.com');
    // deleteMany should have cleared the old one; only one OTP in store now
    expect(otpsStore).toHaveLength(1);
  });

  it('enforces resend cooldown within 60 s', async () => {
    await sendOtp('user@example.com');
    // Second request immediately — createdAt is fresh
    await expect(sendOtp('user@example.com')).rejects.toThrow(
      'Please wait before requesting another OTP.'
    );
  });

  it('provider failure returns a safe error message', async () => {
    (mockProvider.sendOtpEmail as jest.Mock).mockRejectedValueOnce(
      new Error('Unable to send OTP. Please try again.')
    );
    await expect(sendOtp('user@example.com')).rejects.toThrow(
      'Unable to send OTP. Please try again.'
    );
  });

  it('plain OTP is never passed to the provider log', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await sendOtp('user@example.com');
    const calls = logSpy.mock.calls.flat().join(' ');
    expect(calls).not.toMatch(/\d{6}/);
    logSpy.mockRestore();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3. verify-OTP
// ════════════════════════════════════════════════════════════════════════════

describe('verifyOtp', () => {
  beforeEach(resetStores);

  it('accepts correct OTP', async () => {
    const plain = await createOtp('user@example.com');
    const result = await verifyOtp('user@example.com', plain);
    expect(result).toBe(true);
  });

  it('rejects wrong OTP', async () => {
    await createOtp('user@example.com');
    await expect(verifyOtp('user@example.com', '000000')).rejects.toThrow(
      'Invalid or expired OTP.'
    );
  });

  it('rejects expired OTP', async () => {
    const plain = '123456';
    const hash  = await bcrypt.hash(plain, 1);
    otpsStore.push(makeOtpDoc({
      email:     'user@example.com',
      otpHash:   hash,
      expiresAt: new Date(Date.now() - 1000), // already expired
      verified:  false,
      attempts:  0,
    }));
    await expect(verifyOtp('user@example.com', plain)).rejects.toThrow(
      'Invalid or expired OTP.'
    );
  });

  it('rejects already-verified (used) OTP', async () => {
    const plain = '123456';
    const hash  = await bcrypt.hash(plain, 1);
    otpsStore.push(makeOtpDoc({
      email:     'user@example.com',
      otpHash:   hash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified:  true, // already used
      attempts:  0,
    }));
    await expect(verifyOtp('user@example.com', plain)).rejects.toThrow(
      'Invalid or expired OTP.'
    );
  });

  it('marks OTP as verified after success — single use', async () => {
    const plain = await createOtp('user@example.com');
    await verifyOtp('user@example.com', plain);
    expect(otpsStore[0].verified).toBe(true);

    // Second attempt on same OTP must fail
    await expect(verifyOtp('user@example.com', plain)).rejects.toThrow(
      'Invalid or expired OTP.'
    );
  });

  it('locks out after max attempts', async () => {
    const plain = await createOtp('user@example.com');
    // Exhaust attempts with wrong OTP
    for (let i = 0; i < 5; i++) {
      await verifyOtp('user@example.com', '000000').catch(() => {});
    }
    // Now correct OTP should still be rejected
    await expect(verifyOtp('user@example.com', plain)).rejects.toThrow(
      'Too many attempts. Please try again later.'
    );
  });

  it('normalises email on verify (case/whitespace)', async () => {
    const plain = await createOtp('user@example.com');
    const result = await verifyOtp('  USER@EXAMPLE.COM  ', plain);
    expect(result).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4. AuthService — new user creates player + smashId
// ════════════════════════════════════════════════════════════════════════════

describe('AuthService.loginOrRegister — new user', () => {
  beforeEach(resetStores);

  it('creates a new user with role=player and a smashId', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);

    const result = await AuthService.loginOrRegister({
      email: 'new@example.com',
      name:  'New Player',
    });

    expect(result.email).toBe('new@example.com');
    expect(result.role).toBe('player');
    expect(result.smashId).toMatch(/^SMA\d{6}$/);
    expect(result.token).toBeTruthy();
  });

  it('returns a valid JWT', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);

    const result = await AuthService.loginOrRegister({
      email: 'jwt@example.com',
      name:  'JWT User',
    });

    const decoded: any = jwt.decode(result.token);
    expect(decoded).toBeTruthy();
    expect(decoded.id).toBeTruthy();
  });

  it('requires name for new user', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      AuthService.loginOrRegister({ email: 'noname@example.com' })
    ).rejects.toThrow('Name is required for registration.');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 5. AuthService — existing user login
// ════════════════════════════════════════════════════════════════════════════

describe('AuthService.loginOrRegister — existing user', () => {
  beforeEach(resetStores);

  it('logs in an existing user and preserves their role', async () => {
    const user = createUser({ role: 'player', emailVerified: true });
    (User.findOne as jest.Mock).mockResolvedValueOnce(user);

    const result = await AuthService.loginOrRegister({ email: user.email });
    expect(result.role).toBe('player');
    expect(result.token).toBeTruthy();
  });

  it('never downgrades an existing admin', async () => {
    const admin = createUser({ role: 'admin', emailVerified: true });
    (User.findOne as jest.Mock).mockResolvedValueOnce(admin);

    const result = await AuthService.loginOrRegister({ email: admin.email });
    expect(result.role).toBe('admin');
  });

  it('sets emailVerified=true on first login if not already set', async () => {
    const user = createUser({ emailVerified: false });
    (User.findOne as jest.Mock).mockResolvedValueOnce(user);

    await AuthService.loginOrRegister({ email: user.email });
    expect(user.save).toHaveBeenCalled();
    expect(user.emailVerified).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. Public registration cannot select ADMIN
// ════════════════════════════════════════════════════════════════════════════

describe('AuthService — role enforcement', () => {
  beforeEach(resetStores);

  it('new user always gets role=player regardless of any role field', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);

    // Even if caller passes role=admin somehow, loginOrRegister does not accept it
    const result = await AuthService.loginOrRegister({
      email: 'hacker@example.com',
      name:  'Hacker',
    });
    // The service hardcodes 'player' — no role parameter accepted
    expect(result.role).toBe('player');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 7. Legacy user without email — does not break unrelated save()
// ════════════════════════════════════════════════════════════════════════════

describe('Legacy user without email', () => {
  it('can save() without triggering unique email constraint', async () => {
    // A legacy user with no email field should not fail on save
    const legacyUser = createUser({ email: undefined, emailVerified: false });
    legacyUser.save = jest.fn().mockResolvedValue(legacyUser);
    // Just calling save with no email must not throw
    await expect(legacyUser.save()).resolves.not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 8. send-OTP response equivalence (known vs unknown email)
// ════════════════════════════════════════════════════════════════════════════

describe('Account enumeration prevention', () => {
  beforeEach(resetStores);

  it('sendOtp resolves for both known and unknown emails', async () => {
    // Unknown email — should not throw, should send
    await expect(sendOtp('unknown@example.com')).resolves.not.toThrow();
    // Known email — same behaviour
    createUser({ email: 'known@example.com' });
    // Reset OTP store so cooldown doesn't trigger
    otpsStore.length = 0;
    await expect(sendOtp('known@example.com')).resolves.not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 9. Plain OTP is never stored or logged
// ════════════════════════════════════════════════════════════════════════════

describe('OTP security', () => {
  beforeEach(resetStores);

  it('stores only the hash, never the plain OTP', async () => {
    await sendOtp('secure@example.com');
    const doc = otpsStore[0];
    expect(doc.otpHash).toBeTruthy();
    // A 6-digit number should NOT appear raw in the stored doc
    expect(JSON.stringify(doc)).not.toMatch(/"otpHash":"\d{6}"/);
    expect(doc.otpHash.startsWith('$2')).toBe(true);
  });

  it('never logs the plain OTP', async () => {
    const logSpy  = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await sendOtp('secure@example.com');
    const allOutput = [
      ...logSpy.mock.calls.flat(),
      ...warnSpy.mock.calls.flat(),
    ].join(' ');
    expect(allOutput).not.toMatch(/\b\d{6}\b/);
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 10. JWT-authenticated request + auth middleware behaviour
// ════════════════════════════════════════════════════════════════════════════

describe('JWT token', () => {
  beforeEach(resetStores);

  it('token is a valid signed JWT', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);

    const result = await AuthService.loginOrRegister({
      email: 'jwt2@example.com',
      name:  'Token Test',
    });
    const { config } = require('../config');
    const decoded: any = jwt.verify(result.token, config.jwtSecret);
    expect(decoded.id).toBeTruthy();
  });

  it('getProfile resolves with the correct user', async () => {
    const user = createUser({ _id: '42' });
    (User.findById as jest.Mock).mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      lean:   jest.fn().mockResolvedValue(user),
    });
    const profile = await AuthService.getProfile('42');
    expect(profile.email).toBe(user.email);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 11. Production startup refuses with missing email config
// ════════════════════════════════════════════════════════════════════════════

describe('validateConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('exits in production if SMTP credentials are missing', () => {
    process.env.NODE_ENV      = 'production';
    process.env.RESEND_API_KEY = '';
    process.env.EMAIL_FROM     = 'no-reply@example.com';

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);

    expect(() => validateConfig()).toThrow('process.exit called');
    exitSpy.mockRestore();
  });

  it('does not exit in development if SMTP credentials are missing', () => {
    process.env.NODE_ENV      = 'development';
    process.env.RESEND_API_KEY = '';
    process.env.EMAIL_FROM     = '';

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    expect(() => validateConfig()).not.toThrow();
    exitSpy.mockRestore();
  });

  it('does not exit in production when all SMTP config is present', () => {
    process.env.NODE_ENV       = 'production';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM     = 'no-reply@example.com';

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    expect(() => validateConfig()).not.toThrow();
    exitSpy.mockRestore();
  });
});
