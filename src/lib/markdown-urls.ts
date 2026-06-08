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

const IMG_DIM = String.raw`(?:\{w=\d+(?:\s+h=\d+)?\}|\[[^\]]+\])`;

function sanitizeImageLine(line: string): string {
  const m = line.trim().match(new RegExp(String.raw`^!\[([^\]]*)\]\(([^)]*)\)(\s*${IMG_DIM})?$`));
  if (!m) return "";
  if (!m[2] || m[1] === "__pending_image__") return "";
  const safe = sanitizeMarkdownUrl(m[2], "image");
  return safe ? `![${m[1]}](${safe})${m[3] ?? ""}` : "";
}

/** Strip or fix bad urls in saved markdown source. */
export function sanitizeMarkdownContent(md: string): string {
  let out = md.replace(/^!\[button\]\(([^)]*)\)([^\n]*)/gm, (line, url, rest) => {
    const safe = sanitizeMarkdownUrl(String(url).trim(), "link");
    return safe ? `![button](${safe})${rest}` : "";
  });

  out = out.replace(
    new RegExp(String.raw`:::carousel(?:\{w=\d+(?:\s+h=\d+)?\}|\[[^\]]+\])?\n([\s\S]*?):::`, "g"),
    (block, body: string) => {
      const open =
        block.match(/^:::carousel(?:\{w=\d+(?:\s+h=\d+)?\}|\[[^\]]+\])?/)?.[0] ?? ":::carousel";
      const lines = body.split("\n").map(sanitizeImageLine).filter(Boolean);
      return lines.length ? `${open}\n${lines.join("\n")}\n:::` : "";
    }
  );

  out = out.replace(
    new RegExp(String.raw`!\[([^\]]*)\]\(([^)]*)\)(${IMG_DIM})?|\[([^\]]*)\]\(([^)]+)\)`, "g"),
    (match, imgAlt, imgUrl, imgDims, linkText, linkUrl) => {
      if (imgUrl !== undefined) {
        if (!imgUrl || imgAlt === "__pending_image__") return "";
        const safe = sanitizeMarkdownUrl(imgUrl, "image");
        return safe ? `![${imgAlt}](${safe})${imgDims ?? ""}` : `*${imgAlt || "image removed"}*`;
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
