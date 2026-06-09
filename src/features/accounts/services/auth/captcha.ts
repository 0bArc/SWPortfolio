import { turnstileConfig } from "@api-config";

export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  const secret = turnstileConfig.secretKey;
  if (!secret) return false;
  if (!token) return false;

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (ip) body.set("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export function captchaConfigured(): boolean {
  return Boolean(turnstileConfig.secretKey && turnstileConfig.siteKey);
}

export function turnstileSiteKey(): string {
  return turnstileConfig.siteKey;
}
