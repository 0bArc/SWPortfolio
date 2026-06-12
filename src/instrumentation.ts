/** Run additive schema + data backfills when the Node server starts (PM2 / next start). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL?.trim()) return;

  try {
    const { getPoolReady } = await import("@/database");
    await getPoolReady();
  } catch (err) {
    console.error("[instrumentation] database init failed:", err);
  }
}
