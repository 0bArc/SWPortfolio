import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

const ENC_PREFIX = "enc1:";
const IV_LEN = 12;
const KEY_LEN = 32;

export type TokenPurpose = "session" | "email_verify";

function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const buf = Buffer.from(trimmed, "base64");
  if (buf.length !== KEY_LEN) {
    throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44-char base64)");
  }
  return buf;
}

/** 32-byte secret — required in production for email encryption + token pepper. */
export function getDataKey(): Buffer | null {
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_ENCRYPTION_KEY is required in production");
    }
    return null;
  }
  return parseKey(raw);
}

export function encryptionEnabled(): boolean {
  return getDataKey() != null;
}

/** AES-256-GCM — authenticated encryption for emails at rest. */
export function encryptField(plaintext: string): string {
  const key = getDataKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptField(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored;

  const key = getDataKey();
  if (!key) throw new Error("Cannot decrypt: DATA_ENCRYPTION_KEY not configured");

  const payload = stored.slice(ENC_PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted field");

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** HMAC lookup index — enables unique checks without storing plaintext email. */
export function hashLookup(normalizedValue: string): string {
  const key = getDataKey();
  if (!key) {
    return createHash("sha256").update(`lookup:${normalizedValue}`).digest("hex");
  }
  return createHmac("sha256", key).update(`lookup:${normalizedValue}`).digest("hex");
}

/** Pepper token hashes — DB leak alone cannot forge sessions. */
export function hashToken(raw: string, purpose: TokenPurpose): string {
  const key = getDataKey();
  if (!key) {
    return createHash("sha256").update(`${purpose}:${raw}`).digest("hex");
  }
  return createHmac("sha256", key).update(`${purpose}:${raw}`).digest("hex");
}

/** Session lookup — accepts legacy SHA-256 hashes during rotation. */
export function sessionTokenHashes(raw: string): string[] {
  const key = getDataKey();
  const hashes = [hashToken(raw, "session")];
  if (key) {
    hashes.push(createHash("sha256").update(raw).digest("hex"));
  }
  return [...new Set(hashes)];
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskedLocal = local.length <= 2 ? `${local[0] ?? ""}*` : `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local.at(-1)}`;
  return `${maskedLocal}@${domain}`;
}
