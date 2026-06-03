// Usage: npm run aus:warning | aus:alert | aus:severe | aus:bootup
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const SEVERE_PING = "&1511768527055622394";

if (!WEBHOOK) {
  console.error("Missing DISCORD_WEBHOOK_URL in .env.local");
  process.exit(1);
}

const TYPE = process.argv[2] ?? "warning";

const PAYLOADS = {
  summary: {
    embeds: [
      {
        title: "AUS: Incident Summary",
        color: 0xff6600,
        fields: [
          { name: "Duration", value: "87s", inline: true },
          { name: "Total Events", value: "34", inline: true },
          { name: "Unique IPs", value: "2", inline: true },
          { name: "Probes", value: "28", inline: true },
          { name: "Rate Limits", value: "3", inline: true },
          { name: "Scanner UAs", value: "3", inline: true },
          { name: "IPs", value: "1.3.3.7, 5.5.5.5", inline: false },
          { name: "Top Paths", value: "/wp-admin\n/.env\n/phpmyadmin\n/shell.php\n/.git/config\n/xmlrpc.php\n/backup.sql\n/.svn/entries", inline: false },
          { name: "Repeat Offenders", value: "1.3.3.7 (89 hits total)", inline: false },
          { name: "Window", value: `${new Date(Date.now() - 87000).toISOString()} → ${new Date().toISOString()}`, inline: false },
        ],
        footer: { text: "AUS — Response Management · kristiansen.icu" },
      },
    ],
  },
  bootup: {
    embeds: [
      {
        title: "AUS: Server Online",
        color: 0xffffff,
        description: "kristiansen.icu started.",
        fields: [{ name: "Time", value: new Date().toISOString(), inline: true }],
        footer: { text: "AUS — Auto Update Security · kristiansen.icu" },
      },
    ],
  },
  warning: {
    embeds: [
      {
        title: "AUS: Probe Blocked",
        color: 0xffcc00,
        fields: [
          { name: "Path", value: "/wp-admin/test", inline: true },
          { name: "IP", value: "1.2.3.4", inline: true },
          { name: "UA", value: "Mozilla/5.0 (test)", inline: false },
          { name: "Time", value: new Date().toISOString(), inline: true },
        ],
        footer: { text: "AUS — Auto Update Security · kristiansen.icu" },
      },
    ],
  },
  alert: {
    embeds: [
      {
        title: "AUS: Rate Limit",
        color: 0xff6600,
        fields: [
          { name: "Path", value: "/api/test", inline: true },
          { name: "IP", value: "1.2.3.4", inline: true },
          { name: "Requests", value: "100+ / 60s", inline: true },
          { name: "Time", value: new Date().toISOString(), inline: true },
        ],
        footer: { text: "AUS — Auto Update Security · kristiansen.icu" },
      },
    ],
  },
  severe: {
    content: `<@${SEVERE_PING}>`,
    embeds: [
      {
        title: "AUS: Critical Security Event",
        color: 0xff0000,
        description: "Severe threat detected on kristiansen.icu. Immediate review required.",
        fields: [
          { name: "Severity", value: "CRITICAL", inline: true },
          { name: "Time", value: new Date().toISOString(), inline: true },
        ],
        footer: { text: "AUS — Auto Update Security · kristiansen.icu" },
      },
    ],
  },
};

if (!PAYLOADS[TYPE]) {
  console.error(`Unknown type: ${TYPE}. Use: bootup | warning | alert | severe`);
  process.exit(1);
}

const res = await fetch(WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(PAYLOADS[TYPE]),
});

if (res.ok) {
  console.log(`AUS test fired: ${TYPE}`);
} else {
  console.error(`Discord error: ${res.status} ${await res.text()}`);
  process.exit(1);
}
