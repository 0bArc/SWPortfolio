/** Rate limits for /api/v1 (machine clients). */

export const API_V1_LIMITS = {
  /** Any /api/v1 call per client IP */
  ip: { max: 100, windowMs: 60_000 },
  /** Failed key lookup per IP — brute-force guard */
  ipInvalidKey: { max: 30, windowMs: 15 * 60_000 },
  /** Successful calls per account */
  account: { max: 500, windowMs: 60 * 60_000 },
  /** Per key prefix (valid keys only) */
  keyPrefix: { max: 120, windowMs: 60_000 },
} as const;

export const API_KEY_MGMT_LIMITS = {
  create: { max: 10, windowMs: 60 * 60_000 },
  revoke: { max: 20, windowMs: 60 * 60_000 },
  list: { max: 60, windowMs: 60_000 },
} as const;
