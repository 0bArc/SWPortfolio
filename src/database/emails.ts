import { decryptField, encryptField, hashLookup, maskEmail } from "@/lib/crypto";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function prepareEmailStorage(email: string): {
  ciphertext: string;
  lookupHash: string;
} {
  const normalized = normalizeEmail(email);
  return {
    ciphertext: encryptField(normalized),
    lookupHash: hashLookup(normalized),
  };
}

export function readStoredEmail(stored: string | null): string | null {
  if (!stored) return null;
  try {
    return decryptField(stored);
  } catch {
    return null;
  }
}

export function maskedStoredEmail(stored: string | null): string | null {
  const plain = readStoredEmail(stored);
  return plain ? maskEmail(plain) : null;
}
