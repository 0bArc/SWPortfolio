import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  getAccountEmail,
  normalizeEmail,
} from "@/database/email-verification";
import { appendActivity } from "@/database/accounts";
import { sendMail, mailConfigured } from "@/lib/mail";
import { buildVerifyUrl, verificationEmailContent } from "./templates";

export async function sendVerificationEmail(
  accountId: number,
  username: string,
  email: string,
  siteBaseUrl?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mailConfigured()) {
    return { ok: false, error: "Mail not configured" };
  }

  const token = await createEmailVerificationToken(accountId);
  const verifyUrl = buildVerifyUrl(token, siteBaseUrl);
  const content = verificationEmailContent({ username, verifyUrl });

  const result = await sendMail({
    to: normalizeEmail(email),
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (!result.ok) return result;

  await appendActivity(accountId, {
    type: "email_verification_sent",
    at: new Date().toISOString(),
  });

  return { ok: true };
}

export async function verifyEmailByToken(
  rawToken: string
): Promise<{ accountId: number; username: string } | null> {
  const consumed = await consumeEmailVerificationToken(rawToken.trim());
  if (!consumed) return null;

  await appendActivity(consumed.accountId, {
    type: "email_verified",
    at: new Date().toISOString(),
  });

  return { accountId: consumed.accountId, username: consumed.username };
}

export async function resendVerificationEmail(
  accountId: number,
  username: string,
  siteBaseUrl?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = await getAccountEmail(accountId);
  if (!email) {
    return { ok: false, error: "No email on file" };
  }
  return sendVerificationEmail(accountId, username, email, siteBaseUrl);
}
