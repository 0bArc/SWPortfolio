import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

// ── Detection lists ───────────────────────────────────────────────────────────

const BLOCKED = [
  /\.php($|\?)/i,
  /\.asp(x?)($|\?)/i,
  /\.env($|\/)/i,
  /\/\.git(\/|$)/,
  /\/\.svn(\/|$)/,
  /\/wp-(admin|login|content|includes)/i,
  /\/wordpress/i,
  /\/phpmyadmin/i,
  /\/(xmlrpc|cgi-bin|shell|eval)/i,
  /\/(backup|dump|database)\./i,
  /\/etc\/passwd/i,
];

const SCANNER_UA = [
  /gobuster/i,
  /nikto/i,
  /sqlmap/i,
  /masscan/i,
  /zgrab/i,
  /nmap/i,
  /dirbuster/i,
  /dirb\//i,
  /wfuzz/i,
  /feroxbuster/i,
  /nuclei/i,
  /httpx/i,
  /whatweb/i,
  /acunetix/i,
  /nessus/i,
  /openvas/i,
  /python-requests\/2\./i,
  /go-http-client/i,
];

// ── Types & state ─────────────────────────────────────────────────────────────

interface AUSEvent {
  type: "probe" | "ratelimit" | "scanner";
  path: string;
  ip: string;
  ua: string;
  ts: number;
}

interface IPRecord {
  count: number;
  types: Set<string>;
  firstSeen: number;
  lastSeen: number;
}

// IP memory — persists per instance, tracks repeat offenders
const ipMemory = new Map<string, IPRecord>();

// Current incident buffer
const incidentBuffer: AUSEvent[] = [];
let severeSent = false;
let coolTimer: ReturnType<typeof setTimeout> | null = null;

// Rate limiting per IP
const RL = new Map<string, { n: number; t: number }>();

// Slow scan tracker — only blocked paths count (not normal pages)
const SCAN_TRACK = new Map<string, { paths: Set<string>; t: number }>();

// Discord send queue — enforces gap between sends (30/min limit = ~2s/msg; we use 3s to be safe)
let lastSendAt = 0;
const SEND_GAP_MS = 3_000;

// Thresholds
const RL_MAX = 100;
const RL_WINDOW_MS = 60_000;
const SCAN_WINDOW_MS = 5 * 60_000;
const SCAN_THRESHOLD = 20;
const PROBE_ATTACK_THRESHOLD = 10;
const COOL_WAIT_MS = 45_000;
const ROLE_ID = "1511768527055622394";

// ── Bootup ping ───────────────────────────────────────────────────────────────

if (process.env.DISCORD_WEBHOOK_URL) {
  fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{
        title: "AUS: Server Online",
        color: 0xffffff,
        description: "kristiansen.icu started.",
        fields: [{ name: "Time", value: new Date().toISOString(), inline: true }],
        footer: { text: "AUS — Response Management · kristiansen.icu" },
      }],
    }),
  }).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isScannerUA(ua: string): boolean {
  return SCANNER_UA.some((p) => p.test(ua));
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const e = RL.get(ip);
  if (!e || now - e.t > RL_WINDOW_MS) {
    RL.set(ip, { n: 1, t: now });
    return false;
  }
  e.n++;
  return e.n > RL_MAX;
}

function trackBlockedPath(ip: string, path: string): boolean {
  const now = Date.now();
  const e = SCAN_TRACK.get(ip);
  if (!e || now - e.t > SCAN_WINDOW_MS) {
    SCAN_TRACK.set(ip, { paths: new Set([path]), t: now });
    return false;
  }
  e.paths.add(path);
  return e.paths.size >= SCAN_THRESHOLD;
}

function recordIP(ip: string, type: string): void {
  const now = Date.now();
  const e = ipMemory.get(ip);
  if (e) { e.count++; e.types.add(type); e.lastSeen = now; }
  else { ipMemory.set(ip, { count: 1, types: new Set([type]), firstSeen: now, lastSeen: now }); }
}

function isAttack(type: AUSEvent["type"], ip: string): boolean {
  if (type === "scanner" || type === "ratelimit") return true;
  return (ipMemory.get(ip)?.count ?? 0) >= PROBE_ATTACK_THRESHOLD;
}

// ── Discord ───────────────────────────────────────────────────────────────────

function discordSend(payload: object, waitFn?: (p: Promise<unknown>) => void): void {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const now = Date.now();
  const gap = Math.max(0, lastSendAt + SEND_GAP_MS - now);
  lastSendAt = now + gap;
  const p = new Promise<void>((resolve) => {
    setTimeout(() => {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {}).finally(resolve);
    }, gap);
  });
  waitFn?.(p);
}

function buildSeverePayload(trigger: AUSEvent): object {
  return {
    content: `<@&${ROLE_ID}>`,
    embeds: [{
      title: "AUS: Attack Detected",
      color: 0xff0000,
      description: "Active scan or attack in progress. Monitoring. Full summary will follow when traffic settles.",
      fields: [
        { name: "Trigger", value: trigger.type, inline: true },
        { name: "IP", value: trigger.ip, inline: true },
        { name: "Path", value: trigger.path, inline: true },
        { name: "UA", value: trigger.ua.slice(0, 200) || "–", inline: false },
        { name: "Time", value: new Date(trigger.ts).toISOString(), inline: true },
      ],
      footer: { text: "AUS — Response Management · kristiansen.icu" },
    }],
  };
}

function buildSummaryPayload(events: AUSEvent[]): object {
  const probes = events.filter((e) => e.type === "probe").length;
  const limits = events.filter((e) => e.type === "ratelimit").length;
  const scanners = events.filter((e) => e.type === "scanner").length;
  const uniqueIPs = [...new Set(events.map((e) => e.ip))];
  const topPaths = [...new Set(events.map((e) => e.path))].slice(0, 8);
  const duration = Math.round((Date.now() - events[0].ts) / 1000);
  const color = limits > 0 || scanners > 0 ? 0xff6600 : 0xffcc00;

  const repeatOffenders = uniqueIPs
    .map((ip) => ({ ip, rec: ipMemory.get(ip) }))
    .filter((x) => (x.rec?.count ?? 0) > 20)
    .map((x) => `${x.ip} (${x.rec!.count} hits total)`)
    .slice(0, 5);

  return {
    embeds: [{
      title: "AUS: Incident Summary",
      color,
      fields: [
        { name: "Duration", value: `${duration}s`, inline: true },
        { name: "Total Events", value: `${events.length}`, inline: true },
        { name: "Unique IPs", value: `${uniqueIPs.length}`, inline: true },
        { name: "Probes", value: `${probes}`, inline: true },
        { name: "Rate Limits", value: `${limits}`, inline: true },
        { name: "Scanner UAs", value: `${scanners}`, inline: true },
        { name: "IPs", value: uniqueIPs.slice(0, 8).join(", ") || "–", inline: false },
        ...(topPaths.length ? [{ name: "Top Paths", value: topPaths.join("\n"), inline: false }] : []),
        ...(repeatOffenders.length ? [{ name: "Repeat Offenders", value: repeatOffenders.join("\n"), inline: false }] : []),
        { name: "Window", value: `${new Date(events[0].ts).toISOString()} → ${new Date().toISOString()}`, inline: false },
      ],
      footer: { text: "AUS — Response Management · kristiansen.icu" },
    }],
  };
}

// ── Incident management ───────────────────────────────────────────────────────

function closeIncident(): void {
  severeSent = false;
  coolTimer = null;
  const events = incidentBuffer.splice(0);
  if (events.length) discordSend(buildSummaryPayload(events));
}

function resetCooldown(): void {
  if (coolTimer) clearTimeout(coolTimer);
  coolTimer = setTimeout(closeIncident, COOL_WAIT_MS);
}

function addEvent(ev: NextFetchEvent, e: AUSEvent): void {
  recordIP(e.ip, e.type);
  incidentBuffer.push(e);

  if (!severeSent && isAttack(e.type, e.ip)) {
    severeSent = true;
    discordSend(buildSeverePayload(e), (p) => ev.waitUntil(p));
  }

  resetCooldown();
}

// ── Proxy ─────────────────────────────────────────────────────────────────────

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const ip = getIP(request);
  const ua = request.headers.get("user-agent") ?? "";
  const ts = Date.now();

  if (isScannerUA(ua)) {
    addEvent(event, { type: "scanner", path: pathname, ip, ua, ts });
    return new NextResponse(null, { status: 404 });
  }

  if (BLOCKED.some((p) => p.test(pathname))) {
    const slowScan = trackBlockedPath(ip, pathname);
    addEvent(event, { type: "probe", path: pathname, ip, ua, ts });
    // slowScan threshold already reflected in ipMemory count via recordIP → isAttack check
    void slowScan;
    return new NextResponse(null, { status: 404 });
  }

  if (isRateLimited(ip)) {
    addEvent(event, { type: "ratelimit", path: pathname, ip, ua, ts });
    return new NextResponse(null, { status: 429 });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}'`,
    "connect-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "font-src 'self'",
  ].join("; ");

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!isDev) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.headers.delete("X-Powered-By");

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
