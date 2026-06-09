export function isDatabaseConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String(err.code) : "";
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
    return true;
  }
  if (err instanceof AggregateError) {
    return err.errors.some((e) => isDatabaseConnectionError(e));
  }
  return false;
}

export function databaseUnavailableMessage(): string {
  return "Database is unavailable. Start Postgres (run.bat db) and try again.";
}
