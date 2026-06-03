// AUS attack simulator — fires against localhost:3000
// Usage: npm run aus:simulate [probe|ratelimit|full]

const BASE = process.env.SIMULATE_URL ?? "http://localhost:3000";
const MODE = process.argv[2] ?? "full";

const PROBES = [
  "/wp-admin",
  "/wp-login.php",
  "/wp-content/uploads/shell.php",
  "/.env",
  "/.git/config",
  "/phpmyadmin",
  "/cgi-bin/test",
  "/etc/passwd",
  "/backup.sql",
  "/shell.php",
  "/eval.php",
  "/xmlrpc.php",
  "/wp-includes/wlwmanifest.xml",
  "/.svn/entries",
  "/database.sql",
  "/admin.php",
];

const FAKE_UAS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "sqlmap/1.7.8#stable (https://sqlmap.org)",
  "Nikto/2.1.6",
  "masscan/1.3",
  "zgrab/0.x",
  "python-requests/2.28.0",
];

function ua() {
  return FAKE_UAS[Math.floor(Math.random() * FAKE_UAS.length)];
}

async function hit(path, label) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "User-Agent": ua(), "X-Forwarded-For": "1.3.3.7" },
    });
    const icon = res.status === 404 ? "BLOCKED" : res.status === 429 ? "RATELIMIT" : "PASSED ";
    console.log(`  [${icon}] ${res.status}  ${label ?? path}`);
  } catch {
    console.log(`  [ERROR ]  ${label ?? path} — is dev server running?`);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runProbes() {
  console.log("\n=== PROBE SCAN ===");
  console.log(`Target: ${BASE}`);
  console.log("Firing known attack paths...\n");
  for (const path of PROBES) {
    await hit(path);
    await sleep(200);
  }
}

async function runRateLimit() {
  console.log("\n=== RATE LIMIT FLOOD ===");
  console.log(`Target: ${BASE}`);
  console.log("Sending 120 rapid requests to trigger rate limit...\n");
  const results = { blocked: 0, limited: 0, passed: 0 };
  for (let i = 1; i <= 120; i++) {
    try {
      const res = await fetch(`${BASE}/`, {
        headers: { "User-Agent": ua(), "X-Forwarded-For": "9.8.7.6" },
      });
      if (res.status === 429) results.limited++;
      else if (res.status === 404) results.blocked++;
      else results.passed++;
      if (i % 20 === 0) console.log(`  Sent ${i}/120 — limited: ${results.limited}`);
    } catch {
      console.log("  ERROR — is dev server running?");
      break;
    }
  }
  console.log(`\n  Done. Passed: ${results.passed}  Blocked: ${results.blocked}  Rate-limited: ${results.limited}`);
}

if (MODE === "probe") {
  await runProbes();
} else if (MODE === "ratelimit") {
  await runRateLimit();
} else {
  await runProbes();
  await sleep(1000);
  await runRateLimit();
}

console.log("\nCheck Discord for alerts.\n");
