/**
 * Vercel serverless function — SmashLive OTP email delivery.
 *
 * Called server-to-server by the Render backend after OTP generation.
 * Gmail credentials are server-side Vercel env vars only — never VITE_ prefixed,
 * never exposed to the browser.
 *
 * Security:
 * - Validates Authorization: Bearer <EMAIL_FUNCTION_SECRET> on every request
 * - Accepts POST only
 * - Validates input (email format + 6-digit OTP)
 * - Never logs OTP, Gmail password, or EMAIL_FUNCTION_SECRET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RE   = /^\d{6}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Method guard ────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Environment variable check ───────────────────────────────────────────────
  const gmailUser    = process.env.GMAIL_USER;
  const gmailPass    = process.env.GMAIL_PASS;
  const functionSecret = process.env.EMAIL_FUNCTION_SECRET;

  if (!gmailUser || !gmailPass || !functionSecret) {
    console.error('[send-email] Missing required environment variables (GMAIL_USER, GMAIL_PASS, or EMAIL_FUNCTION_SECRET)');
    return res.status(500).json({ success: false, message: 'Email service configuration error' });
  }

  // ── Authorization ────────────────────────────────────────────────────────────
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  if (token !== functionSecret) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // ── Input validation ─────────────────────────────────────────────────────────
  const { to, otp } = req.body ?? {};

  if (!to || typeof to !== 'string' || !EMAIL_RE.test(to.trim())) {
    return res.status(400).json({ success: false, message: 'Invalid or missing recipient email' });
  }

  if (!otp || typeof otp !== 'string' || !OTP_RE.test(otp)) {
    return res.status(400).json({ success: false, message: 'OTP must be exactly 6 numeric digits' });
  }

  const recipientEmail = to.trim().toLowerCase();

  // ── Send email via Gmail SMTP ────────────────────────────────────────────────
  const transporter = nodemailer.createTransport({
    host:       'smtp.gmail.com',
    port:       587,
    secure:     false,     // STARTTLS upgrade after connect
    requireTLS: true,      // reject if STARTTLS not available
    auth:       { user: gmailUser, pass: gmailPass },
    connectionTimeout: 10_000,
    greetingTimeout:   8_000,
    socketTimeout:     15_000,
  });

  const html = buildHtml(otp);
  const text = buildText(otp);

  try {
    await transporter.sendMail({
      from:    gmailUser,
      to:      recipientEmail,
      subject: 'SmashLive OTP Verification',
      html,
      text,
    });

    return res.status(200).json({ success: true, message: 'OTP email sent' });

  } catch (err: any) {
    // Log technical details server-side only — never include OTP, credentials, or secret
    console.error(`[send-email] Gmail SMTP error: ${err?.message ?? 'unknown'}`);
    return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
  }
}

function buildHtml(otp: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border-top:4px solid #0EA5E9">
    <h2 style="color:#0B1F3A;margin-top:0;font-size:22px">SmashLive</h2>
    <h3 style="color:#555;font-weight:normal;margin-bottom:24px">OTP Verification</h3>
    <p style="color:#333;margin-bottom:8px">Your verification code is:</p>
    <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#0EA5E9;text-align:center;padding:24px 0;background:#f0f9ff;border-radius:8px;margin:16px 0">
      ${otp}
    </div>
    <p style="color:#777;font-size:13px;margin-top:24px">
      This OTP expires according to the SmashLive verification policy.
    </p>
    <p style="color:#777;font-size:13px">
      If you did not request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

function buildText(otp: string): string {
  return [
    'SmashLive — OTP Verification',
    '',
    'Your verification code is:',
    '',
    otp,
    '',
    'This OTP expires according to the SmashLive verification policy.',
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');
}
