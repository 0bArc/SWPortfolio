const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.length >= 5 && normalized.length <= 254 && EMAIL_RE.test(normalized);
}

export function isValidUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 32 && USERNAME_RE.test(username);
}

export function isValidDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 64;
}

export function isValidBio(bio: string): boolean {
  return bio.length <= 500;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}

const LOCAL_ICON_RE = /^\/api\/images\/[a-f0-9-]{36}$/i;

export function isValidIconUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  if (LOCAL_ICON_RE.test(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && url.length <= 500;
  } catch {
    return false;
  }
}
