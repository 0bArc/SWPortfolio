<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Production deploy (Ubuntu)

**Live server uses `run.sh`, not `run.bat`.** Read the checklist at the top of `run.sh` before shipping schema, env, or storage changes.

| Change type | What to do |
|-------------|------------|
| New DB tables/columns | Additive SQL in `src/database/sql/migrate.sql` only (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`). Never `DROP`/`TRUNCATE` prod data. |
| New env vars | Add to `.env.example` + wire through `api-config.ts` or document in comment. Server `.env.local` is edited on the box. |
| File uploads | Use `uploads/blog/` (created by `run.sh`). Do not assume Windows paths. |
| Deploy flow | Server: `git pull` → `./run.sh update` (migrate + build + PM2 restart). First-time only: `./run.sh auto`. |
| Verify | `./run.sh doctor` — DB row counts, Postgres connection, app HTTP. |

When implementing features, assume **PM2** runs `npm start` on port `APP_PORT`, **Nginx** proxies `SITE_DOMAIN`, and **Postgres** is whatever `DATABASE_URL` in server `.env.local` points to.

Do not add production-only setup that only exists in `run.bat` without mirroring or documenting it in `run.sh`.
