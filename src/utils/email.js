import nodemailer from 'nodemailer';

const brandColors = {
  primary: '#f6a623',
  primaryDark: '#e18c15',
  accent: '#2f3247',
  background: '#fdf9f3',
  panel: '#ffffff'
};

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email transport is not configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS.');
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true' || Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  return cachedTransporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'Tully <no-reply@tullyapp.com>';
  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text
  });
}

export function buildOtpEmail(code, expiryMinutes = 10) {
  const subject = 'Your Tully verification code';
  const text = `Your Tully verification code is ${code}. It expires in ${expiryMinutes} minutes.`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Tully verification</title>
  </head>
  <body style="margin:0;padding:0;background:${brandColors.background};font-family: 'Helvetica Neue', Arial, sans-serif;color:${brandColors.accent};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brandColors.background};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:${brandColors.panel};border-radius:14px;box-shadow:0 10px 30px rgba(47,50,71,0.08);overflow:hidden;">
            <tr>
              <td style="padding:18px 24px;background:linear-gradient(135deg, ${brandColors.primary}, #f4c66f);color:${brandColors.accent};font-weight:700;font-size:20px;">
                Tully • Smart Student Tasks
              </td>
            </tr>
            <tr>
              <td style="padding:26px 24px 10px 24px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:${brandColors.accent};">Verify your email</h1>
                <p style="margin:0 0 16px 0;font-size:15px;color:${brandColors.accent};line-height:1.5;">
                  Use the code below to continue. This code expires in ${expiryMinutes} minutes.
                </p>
                <div style="margin:18px 0;text-align:center;">
                  <div style="display:inline-block;padding:14px 18px;border-radius:12px;border:1px solid ${brandColors.primary};background:linear-gradient(135deg, ${brandColors.primary}, #f4c66f);color:${brandColors.panel};font-size:26px;letter-spacing:6px;font-weight:700;">
                    ${code}
                  </div>
                </div>
                <p style="margin:0 0 14px 0;font-size:13px;color:${brandColors.accent};opacity:0.8;line-height:1.4;">
                  If you did not request this, you can ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 22px 24px;background:${brandColors.background};font-size:12px;color:${brandColors.accent};opacity:0.8;">
                Stay organized and keep learning your way with Tully.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
