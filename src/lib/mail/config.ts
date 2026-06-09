import { mailConfig, siteConfig } from "@api-config";

const RESEND_SANDBOX_FROM = "onboarding@resend.dev";

export function mailConfigured(): boolean {
  return Boolean(mailConfig.resendApiKey && resolvedEmailFrom());
}

/** Sandbox only when MAIL_USE_SANDBOX=true. Otherwise EMAIL_FROM (verified domain). */
export function resolvedEmailFrom(): string {
  const configured = mailConfig.from?.trim();
  if (process.env.MAIL_USE_SANDBOX === "true") return RESEND_SANDBOX_FROM;
  return configured || RESEND_SANDBOX_FROM;
}

export function emailFrom(): string {
  return resolvedEmailFrom();
}

export function emailReplyTo(): string | undefined {
  const reply = mailConfig.replyTo?.trim();
  return reply || undefined;
}

export function siteUrl(): string {
  if (siteConfig.siteUrl) return siteConfig.siteUrl;
  return process.env.NODE_ENV === "production" ? "" : "http://localhost:4000";
}

/** Prefer request origin on localhost so verify links work in dev. */
export function siteUrlForRequest(request?: Request | { headers: Headers }): string {
  const host = request?.headers.get("host");
  const proto = request?.headers.get("x-forwarded-proto") ?? "http";
  if (host && (host.includes("localhost") || host.startsWith("127.0.0.1"))) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return siteUrl();
}

export function emailVerificationRequired(): boolean {
  return Boolean(mailConfig.resendApiKey && mailConfig.from);
}

export function isMailSandbox(): boolean {
  return emailFrom() === RESEND_SANDBOX_FROM;
}
