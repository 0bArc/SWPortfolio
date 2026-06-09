import type { Pool } from "pg";
import { ACCOUNTS_TABLE } from "@/database/schema";
import { encryptionEnabled } from "@/lib/crypto";
import { prepareEmailStorage, readStoredEmail } from "@/database/emails";

/** One-time upgrade: plaintext emails → AES-256-GCM + HMAC lookup hash. */
export async function migratePlaintextEmails(pool: Pool): Promise<void> {
  if (!encryptionEnabled()) return;

  const { rows } = await pool.query<{ id: number; email: string }>(
    `SELECT id, email FROM ${ACCOUNTS_TABLE}
     WHERE email IS NOT NULL AND (email_hash IS NULL OR email_hash = '')`
  );

  for (const row of rows) {
    const plain = readStoredEmail(row.email);
    if (!plain || plain.includes("@") === false) continue;
    const stored = prepareEmailStorage(plain);
    await pool.query(
      `UPDATE ${ACCOUNTS_TABLE} SET email = $2, email_hash = $3, updated_at = NOW() WHERE id = $1`,
      [row.id, stored.ciphertext, stored.lookupHash]
    );
  }
}
