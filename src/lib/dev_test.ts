/** Flip enabled for short idle timeouts (local testing only). */
export const DEV_TEST = {
  enabled: false,
  /** Total idle time before logout */
  // make it 10 minutes

  idleMs: 10 * 60 * 1000,
  /** Warning duration — modal at idleMs - warnBeforeMs */
  warnBeforeMs: 2 * 60 * 1000,
} as const;

export const PROD_IDLE = {
  idleMs: 15 * 60 * 1000,
  warnBeforeMs: 2 * 60 * 1000,
} as const;
