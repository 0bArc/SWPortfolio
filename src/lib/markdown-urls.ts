/** Allowed markdown link/image targets in blog content. */

const BLOCKED = ["javascript:", "data:", "vbscript:", "file:"];

export function sanitizeMarkdownUrl(
  raw: string,
  kind: "link" | "image"
): string | null {
  const url = raw.trim();
  if (!url || url.includes("..")) return null;

  const lower = url.toLowerCase();
  if (BLOCKED.some((p) => lower.startsWith(p))) return null;
  if (url.startsWith("//")) return null;

  if (kind === "image") {
    if (/^\/api\/images\/[a-f0-9-]{36}$/i.test(url)) return url;
    if (url.startsWith("https://")) return url;
    return null;
  }

  if (url.startsWith("https://")) return url;
  return null;
}

function sanitizeImageLine(line: string): string {
  const m = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (!m) return "";
  const safe = sanitizeMarkdownUrl(m[2], "image");
  return safe ? `![${m[1]}](${safe})` : "";
}

/** Strip or fix bad urls in saved markdown source. */
export function sanitizeMarkdownContent(md: string): string {
  let out = md.replace(/:::carousel\n([\s\S]*?):::/g, (_, body: string) => {
    const lines = body.split("\n").map(sanitizeImageLine).filter(Boolean);
    return lines.length ? `:::carousel\n${lines.join("\n")}\n:::` : "";
  });

  out = out.replace(
    /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)/g,
    (match, imgAlt, imgUrl, linkText, linkUrl) => {
      if (imgUrl !== undefined) {
        const safe = sanitizeMarkdownUrl(imgUrl, "image");
        return safe ? `![${imgAlt}](${safe})` : `*${imgAlt || "image removed"}*`;
      }
      const safe = sanitizeMarkdownUrl(linkUrl, "link");
      return safe ? `[${linkText}](${safe})` : linkText;
    }
  );

  return out;
}

/** Sanitize rendered HTML href/src attributes. */
export function sanitizeMarkdownHtml(html: string): string {
  return html.replace(
    /\s(href|src)=("([^"]*)"|'([^']*)')/gi,
    (_full, attr, _q1, val1, val2) => {
      const val = (val1 ?? val2 ?? "").trim();
      const kind = attr.toLowerCase() === "src" ? "image" : "link";
      const safe = sanitizeMarkdownUrl(val, kind);
      return safe ? ` ${attr}="${safe}"` : "";
    }
  );
}
