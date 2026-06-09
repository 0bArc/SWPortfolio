import { Resend } from "resend";
import { mailConfig } from "@api-config";
import { emailFrom, emailReplyTo, mailConfigured } from "./config";

let client: Resend | null = null;

export function getResend(): Resend | null {
  if (!mailConfigured()) return null;
  if (!client) {
    client = new Resend(mailConfig.resendApiKey);
  }
  return client;
}

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(input: SendMailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();
  if (!resend) {
    return { ok: false, error: "Mail not configured" };
  }

  const replyTo = emailReplyTo();
  const { data, error } = await resend.emails.send({
    from: emailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    console.error("[mail] Resend error:", error.message);
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: "Resend returned no message id" };
  }
  return { ok: true };
}
