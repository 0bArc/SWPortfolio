import { DEV_TEST, PROD_IDLE } from "@/lib/admin/dev-test";

export interface IdleConfig {
  testMode: boolean;
  idleMs: number;
  warnBeforeMs: number;
  warnAtMs: number;
}

function active() {
  return DEV_TEST.enabled ? DEV_TEST : PROD_IDLE;
}

export function idleTimeoutMs(): number {
  return active().idleMs;
}

export function idleWarnBeforeMs(): number {
  return active().warnBeforeMs;
}

export function idleWarnAtMs(): number {
  return idleTimeoutMs() - idleWarnBeforeMs();
}

/** Read on server — pass as props to client idle guard. */
export function getIdleConfig(): IdleConfig {
  const { idleMs, warnBeforeMs } = active();
  return {
    testMode: DEV_TEST.enabled,
    idleMs,
    warnBeforeMs,
    warnAtMs: idleMs - warnBeforeMs,
  };
}
