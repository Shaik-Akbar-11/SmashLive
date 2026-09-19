import { z } from 'zod';

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address.');

export const sendOtpSchema = z.object({
  body: z.object({
    email: emailField,
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name:     z.string().min(2),
    email:    emailField,
    otp:      z.string().length(6),
    gender:   z.string().optional(),
    state:    z.string().optional(),
    district: z.string().optional(),
    // role is intentionally excluded — public registration always creates player
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    otp:   z.string().length(6),
  }),
});
