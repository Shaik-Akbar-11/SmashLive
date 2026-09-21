/**
 * Email provider interface + Resend implementation.
 * The auth service imports only the interface; it never imports Resend directly.
 * Uses native fetch — no new runtime dependency.
 */

export interface EmailProvider {
  sendOtpEmail(email: string, otp: string): Promise<void>;
}

/**
 * Resend HTTP API provider.
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly otpTtlMinutes: number;

  constructor(apiKey: string, from: string, otpTtlMinutes: number) {
    this.apiKey = apiKey;
    this.from = from;
    this.otpTtlMinutes = otpTtlMinutes;
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const subject = 'Your SmashLive Verification Code';
    const html = this.buildHtml(otp);
    const text = this.buildText(otp);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [email],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      // Log technical details server-side only — never include the OTP, key, or token
      const body = await res.text().catch(() => '(unreadable)');
      console.error(`[Email] Resend error ${res.status}: ${body}`);
      throw new Error('Unable to send OTP. Please try again.');
    }
  }

  private buildHtml(otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-top:4px solid #0EA5E9">
    <h2 style="color:#0B1F3A;margin-top:0">SmashLive</h2>
    <p style="color:#333">Hello,</p>
    <p style="color:#333">Your SmashLive verification code is:</p>
    <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0EA5E9;text-align:center;padding:24px 0">
      ${otp}
    </div>
    <p style="color:#555">This code will expire in ${this.otpTtlMinutes} minutes.</p>
    <p style="color:#555">If you did not request this code, you can safely ignore this email.</p>
    <p style="color:#555;margin-bottom:0">Regards,<br>SmashLive Team</p>
  </div>
</body>
</html>`.trim();
  }

  private buildText(otp: string): string {
    return [
      'Hello,',
      '',
      'Your SmashLive verification code is:',
      '',
      otp,
      '',
      `This code will expire in ${this.otpTtlMinutes} minutes.`,
      '',
      'If you did not request this code, you can safely ignore this email.',
      '',
      'Regards,',
      'SmashLive Team',
    ].join('\n');
  }
}

import nodemailer from 'nodemailer';

/**
 * Gmail SMTP provider via Nodemailer.
 * Credentials are read exclusively from environment variables — never hardcoded.
 * SMTP_PASS is never logged.
 */
export class GmailSmtpProvider implements EmailProvider {
  private readonly from: string;
  private readonly otpTtlMinutes: number;
  private readonly transporter: nodemailer.Transporter;

  constructor(
    smtpHost: string,
    smtpPort: number,
    smtpUser: string,
    smtpPass: string,
    from: string,
    otpTtlMinutes: number,
  ) {
    this.from = from;
    this.otpTtlMinutes = otpTtlMinutes;
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for port 465 (SSL), false for 587 (TLS)
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from:    `SmashLive <${this.from}>`,
        to:      email,
        subject: 'Your SmashLive Verification Code',
        html:    this.buildHtml(otp),
        text:    this.buildText(otp),
      });
    } catch (err: any) {
      // Log technical details server-side only — never include OTP, credentials, or tokens
      console.error(`[Email] Gmail SMTP error: ${err?.message ?? 'unknown'}`);
      throw new Error('Unable to send OTP. Please try again.');
    }
  }

  private buildHtml(otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-top:4px solid #0EA5E9">
    <h2 style="color:#0B1F3A;margin-top:0">SmashLive</h2>
    <p style="color:#333">Hello,</p>
    <p style="color:#333">Your SmashLive verification code is:</p>
    <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0EA5E9;text-align:center;padding:24px 0">
      ${otp}
    </div>
    <p style="color:#555">This code will expire in ${this.otpTtlMinutes} minutes.</p>
    <p style="color:#555">If you did not request this code, you can safely ignore this email.</p>
    <p style="color:#555;margin-bottom:0">Regards,<br>SmashLive Team</p>
  </div>
</body>
</html>`.trim();
  }

  private buildText(otp: string): string {
    return [
      'Hello,',
      '',
      'Your SmashLive verification code is:',
      '',
      otp,
      '',
      `This code will expire in ${this.otpTtlMinutes} minutes.`,
      '',
      'If you did not request this code, you can safely ignore this email.',
      '',
      'Regards,',
      'SmashLive Team',
    ].join('\n');
  }
}
