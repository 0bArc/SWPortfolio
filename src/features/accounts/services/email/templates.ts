import { siteUrl } from "@/lib/mail";

const MAIL_BRAND = "Team Stratware";

function siteLabel(): string {
  try {
    return new URL(siteUrl()).hostname.replace(/^www\./, "");
  } catch {
    return "kristiansen.icu";
  }
}

export function verificationEmailContent(input: {
  username: string;
  verifyUrl: string;
}): { subject: string; html: string; text: string } {
  const site = siteLabel();
  const subject = `Verify your email — ${site}`;
  const text = [
    `Hi ${input.username},`,
    "",
    `Confirm your email to finish creating your account on ${site}.`,
    "",
    input.verifyUrl,
    "",
    "This link expires in 24 hours. If you did not sign up, ignore this email.",
    "",
    `— ${MAIL_BRAND}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:480px;margin:0 auto;padding:24px">
  <p>Hi <strong>${escapeHtml(input.username)}</strong>,</p>
  <p>Confirm your email to finish creating your account on <strong>${escapeHtml(site)}</strong>.</p>
  <p style="margin:28px 0">
    <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
      Verify email
    </a>
  </p>
  <p style="font-size:13px;color:#555">Or copy this link:<br><a href="${escapeHtml(input.verifyUrl)}">${escapeHtml(input.verifyUrl)}</a></p>
  <p style="font-size:12px;color:#888;margin-top:32px">Link expires in 24 hours. If you did not sign up, ignore this email.</p>
  <p style="font-size:12px;color:#888;margin-top:24px">— ${escapeHtml(MAIL_BRAND)}</p>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildVerifyUrl(token: string, baseUrl?: string): string {
  const base = (baseUrl ?? siteUrl()).replace(/\/$/, "");
  return `${base}/account/verify-email?token=${encodeURIComponent(token)}`;
}
