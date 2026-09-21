import nodemailer from 'nodemailer';

export interface EmailProvider {
  sendOtpEmail(email: string, otp: string): Promise<void>;
}

/**
 * Gmail SMTP provider via Nodemailer.
 * Uses App Password — never the real Gmail password.
 */
export class GmailSmtpProvider implements EmailProvider {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly otpTtlMinutes: number;

  constructor(
    smtpUser: string,
    smtpPass: string,
    from: string,
    otpTtlMinutes: number,
  ) {
    this.from = from;
    this.otpTtlMinutes = otpTtlMinutes;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',  // Uses Gmail's built-in config (no need for host/port)
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
      console.error(`[Email] Gmail SMTP error: ${err?.message ?? 'unknown'}`);
      throw new Error('Unable to send OTP. Please try again.');
    }
  }

  private buildHtml(otp: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-top:4px solid #0EA5E9">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <div style="background:#0B1F3A;padding:10px;border-radius:10px">
        <span style="color:#0EA5E9;font-size:20px;font-weight:900">⚡</span>
      </div>
      <span style="font-size:20px;font-weight:900;color:#0B1F3A;letter-spacing:-0.5px">Smash<span style="color:#0EA5E9">Live</span></span>
    </div>
    <h2 style="color:#0B1F3A;margin:0 0 8px 0;font-size:22px">Verify Your Identity</h2>
    <p style="color:#555;margin:0 0 24px 0;font-size:14px">Use the code below to complete your SmashLive verification. This code expires in ${this.otpTtlMinutes} minutes.</p>
    <div style="background:#F0F9FF;border:2px solid #0EA5E9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="margin:0 0 8px 0;color:#0B1F3A;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Your OTP Code</p>
      <p style="margin:0;font-size:40px;font-weight:900;letter-spacing:12px;color:#0EA5E9;font-family:monospace">${otp}</p>
    </div>
    <p style="color:#888;font-size:12px;margin:0">If you did not request this code, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#aaa;font-size:11px;margin:0;text-align:center">© SmashLive — The Badminton Network</p>
  </div>
</body>
</html>`;
  }

  private buildText(otp: string): string {
    return `SmashLive Verification Code\n\nYour OTP: ${otp}\n\nThis code expires in ${this.otpTtlMinutes} minutes.\n\nIf you did not request this, ignore this email.`;
  }
}
