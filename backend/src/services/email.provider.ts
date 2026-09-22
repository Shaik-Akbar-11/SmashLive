export interface EmailProvider {
  sendOtpEmail(email: string, otp: string): Promise<void>;
}

/**
 * Brevo (Sendinblue) HTTP API provider.
 * Uses HTTPS port 443 — never blocked by cloud providers.
 * API docs: https://developers.brevo.com/reference/sendtransacemail
 */
export class BrevoEmailProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly fromName: string;
  private readonly otpTtlMinutes: number;

  constructor(apiKey: string, from: string, fromName: string, otpTtlMinutes: number) {
    this.apiKey = apiKey;
    this.from = from;
    this.fromName = fromName;
    this.otpTtlMinutes = otpTtlMinutes;
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.fromName, email: this.from },
        to: [{ email }],
        subject: 'Your SmashLive Verification Code',
        htmlContent: this.buildHtml(otp),
        textContent: this.buildText(otp),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable)');
      console.error(`[Email] Brevo error ${res.status}: ${body}`);
      throw new Error('Unable to send OTP. Please try again.');
    }

    console.log(`[Email] OTP sent to ${email} via Brevo`);
  }

  private buildHtml(otp: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border-top:4px solid #0EA5E9">
    <div style="margin-bottom:24px">
      <span style="font-size:22px;font-weight:900;color:#0B1F3A">Smash<span style="color:#0EA5E9">Live</span></span>
    </div>
    <h2 style="color:#0B1F3A;margin:0 0 8px 0;font-size:20px">Verify Your Identity</h2>
    <p style="color:#555;margin:0 0 24px 0;font-size:14px">Your SmashLive verification code expires in ${this.otpTtlMinutes} minutes.</p>
    <div style="background:#F0F9FF;border:2px solid #0EA5E9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <p style="margin:0 0 8px 0;color:#0B1F3A;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">Your OTP Code</p>
      <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:12px;color:#0EA5E9;font-family:monospace">${otp}</p>
    </div>
    <p style="color:#aaa;font-size:12px;margin:0">If you did not request this, ignore this email.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#aaa;font-size:11px;margin:0;text-align:center">© SmashLive — The Badminton Network</p>
  </div>
</body>
</html>`;
  }

  private buildText(otp: string): string {
    return `SmashLive Verification Code\n\nYour OTP: ${otp}\n\nExpires in ${this.otpTtlMinutes} minutes.\n\nIf you did not request this, ignore this email.`;
  }
}
