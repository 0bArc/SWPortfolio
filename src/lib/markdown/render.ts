import { Marked } from "marked";
import hljs from "highlight.js";
import { sanitizeMarkdownHtml, sanitizeMarkdownUrl } from "@/lib/markdown/urls";

export const PENDING_IMAGE_ALT = "__pending_image__";

const DIM_SUFFIX = String.raw`(?:\{w=(\d+)(?:\s+h=(\d+))?\}|\[([^\]]+)\])`;

const CAROUSEL_RE = new RegExp(
  String.raw`:::carousel${DIM_SUFFIX}?\n([\s\S]*?):::`,
  "g"
);

const SIZED_IMG_LINE_RE = new RegExp(
  String.raw`^!\[([^\]]*)\]\(([^)]+)\)${DIM_SUFFIX}$`,
  "gm"
);

const IMG_LINE_RE = new RegExp(
  String.raw`^!\[([^\]]*)\]\(([^)]*)\)(?:\s*${DIM_SUFFIX})?$`
);

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string) {
  return escapeHtml(s);
}

const BUTTON_LINE_RE = /^!\[button\]/;

export type BlogButtonData = {
  url: string;
  text: string;
  color: "white" | "black";
  position: "left" | "center" | "right";
};

export function parseButtonLine(line: string): BlogButtonData | null {
  const t = line.trim();
  if (!BUTTON_LINE_RE.test(t)) return null;

  const urlFromParen = t.match(/^!\[button\]\(([^)]*)\)/)?.[1];
  const attrs: Record<string, string> = {};
  for (const m of t.matchAll(/\[([a-z]+):([^\]]*)\]/gi)) {
    attrs[m[1].toLowerCase()] = m[2].trim();
  }

  const url = (urlFromParen ?? attrs.url ?? "").trim();
  const text = attrs.text || "Button";
  const colorRaw = (attrs.color ?? "white").toLowerCase();
  const color: "white" | "black" = colorRaw === "black" ? "black" : "white";
  const posRaw = (attrs.position ?? "center").toLowerCase();
  const position: "left" | "center" | "right" =
    posRaw === "left" || posRaw === "right" ? posRaw : "center";

  return { url, text, color, position };
}

export function serializeButton(data: BlogButtonData): string {
  const urlPart = data.url ? `(${data.url})` : "";
  return `![button]${urlPart}[text:${data.text}][color:${data.color}][position:${data.position}]\n`;
}

function buttonHtml(data: BlogButtonData): string {
  const safe = data.url ? sanitizeMarkdownUrl(data.url, "link") : null;
  const cls = `blog-btn blog-btn--${data.color}`;
  const label = escapeHtml(data.text);
  const inner = safe
    ? `<a href="${safe}" class="${cls}" rel="noopener noreferrer" target="_blank">${label}</a>`
    : `<span class="${cls}">${label}</span>`;
  return `<div class="blog-btn-wrap blog-btn-wrap--${data.position}">${inner}</div>`;
}

function expandButtons(md: string): string {
  return md.replace(/^!\[button\][^\n]*/gm, (line) => {
    const parsed = parseButtonLine(line);
    return parsed ? buttonHtml(parsed) : line;
  });
}

function parseBracketDims(raw: string): { w?: number; h?: number } {
  const out: { w?: number; h?: number } = {};
  for (const part of raw.split(";")) {
    const kv = part.trim().match(/^([wh]):(\d+)$/i);
    if (kv) out[kv[1].toLowerCase() as "w" | "h"] = Number(kv[2]);
  }
  return out;
}

export function parseDims(raw?: string): { w?: number; h?: number } {
  if (!raw) return {};
  const brace = raw.match(/\{w=(\d+)(?:\s+h=(\d+))?\}/);
  if (brace) {
    return { w: Number(brace[1]), h: brace[2] ? Number(brace[2]) : undefined };
  }
  const bracket = raw.match(/\[([^\]]+)\]/);
  if (bracket) return parseBracketDims(bracket[1]);
  return {};
}

function dimsFromGroups(g1?: string, g2?: string, g3?: string): { w?: number; h?: number } {
  if (g1 !== undefined) {
    return { w: Number(g1), h: g2 ? Number(g2) : undefined };
  }
  if (g3) return parseBracketDims(g3);
  return {};
}

export function dimSuffix(w?: number, h?: number): string {
  if (!w && !h) return "";
  const p: string[] = [];
  if (h) p.push(`h:${h}`);
  if (w) p.push(`w:${w}`);
  return `[${p.join(";")}]`;
}

export function isPendingImage(alt: string, url: string): boolean {
  return alt === PENDING_IMAGE_ALT || url === "";
}

export function parseImageLine(line: string) {
  const t = line.trim();
  const m = t.match(IMG_LINE_RE);
  if (!m) return null;
  if (m[1] === "button") return null;
  const dims = dimsFromGroups(m[3], m[4], m[5]);
  return { alt: m[1], url: m[2], ...dims };
}

export function serializeImage(alt: string, url: string, w?: number, h?: number): string {
  return `![${alt}](${url})${dimSuffix(w, h)}\n`;
}

export function serializeCarousel(
  slides: { alt: string; url: string; w?: number; h?: number }[],
  w?: number,
  h?: number
): string {
  const body = slides
    .map((s) => `![${s.alt}](${s.url})${dimSuffix(s.w, s.h)}`)
    .join("\n");
  return `:::carousel${dimSuffix(w, h)}\n${body}\n:::\n`;
}

export type ImageBlockData = {
  type: "image";
  alt: string;
  url: string;
  w?: number;
  h?: number;
  start: number;
  end: number;
};

export type CarouselBlockData = {
  type: "carousel";
  w?: number;
  h?: number;
  slides: { alt: string; url: string; w?: number; h?: number }[];
  start: number;
  end: number;
};

export type ContentBlock = ImageBlockData | CarouselBlockData;

export function parseContentBlocks(md: string): ContentBlock[] {
  const carousels: CarouselBlockData[] = [];
  const carouselRe = new RegExp(CAROUSEL_RE.source, "g");
  let cm: RegExpExecArray | null;
  while ((cm = carouselRe.exec(md)) !== null) {
    const slides = cm[4]
      .split("\n")
      .map((l) => parseImageLine(l))
      .filter((x): x is NonNullable<typeof x> => x !== null);
    carousels.push({
      type: "carousel",
      ...dimsFromGroups(cm[1], cm[2], cm[3]),
      slides,
      start: cm.index,
      end: cm.index + cm[0].length,
    });
  }

  const images: ImageBlockData[] = [];
  const lines = md.split("\n");
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = offset;
    const nl = i < lines.length - 1 ? 1 : 0;
    const lineEnd = lineStart + line.length + nl;

    const insideCarousel = carousels.some((c) => lineStart >= c.start && lineStart < c.end);
    if (!insideCarousel) {
      const img = parseImageLine(line);
      if (img) {
        images.push({ type: "image", ...img, start: lineStart, end: lineEnd });
      }
    }
    offset = lineEnd;
  }

  return [...carousels, ...images].sort((a, b) => a.start - b.start);
}

function imgStyleAttr(w?: number, h?: number): string {
  const style: string[] = [];
  if (w) style.push(`width:${w}px`);
  if (h) style.push(`height:${h}px`);
  if (!style.length) return "";
  return ` style="${style.join(";")};max-width:100%"`;
}

function imgTag(src: string, alt: string, w?: number, h?: number): string {
  const safe = sanitizeMarkdownUrl(src, "image");
  if (!safe) return "";
  return `<img src="${safe}" alt="${escapeAttr(alt)}" loading="lazy"${imgStyleAttr(w, h)} />`;
}

function expandSizedImages(md: string): string {
  return md.replace(SIZED_IMG_LINE_RE, (_, alt, url, g1, g2, g3) => {
    const dims = dimsFromGroups(g1, g2, g3);
    return imgTag(url, alt, dims.w, dims.h);
  });
}

function expandCarousels(md: string): string {
  return md.replace(CAROUSEL_RE, (_, g1, g2, g3, body: string) => {
    const { w: cw, h: ch } = dimsFromGroups(g1, g2, g3);
    const carouselStyle =
      cw || ch
        ? ` style="${[cw && `width:${cw}px`, ch && `height:${ch}px`].filter(Boolean).join(";")};max-width:100%"`
        : "";

    const slides = body
      .trim()
      .split("\n")
      .map((line) => {
        const parsed = parseImageLine(line);
        if (!parsed || isPendingImage(parsed.alt, parsed.url)) return "";
        const safe = sanitizeMarkdownUrl(parsed.url, "image");
        if (!safe) return "";
        return `<figure class="blog-carousel-slide"><img src="${safe}" alt="${escapeAttr(parsed.alt)}" loading="lazy"${imgStyleAttr(parsed.w, parsed.h)} /></figure>`;
      })
      .filter(Boolean);

    if (!slides.length) return "";
    return `<div class="blog-carousel" data-carousel${carouselStyle}><div class="blog-carousel-track">${slides.join("")}</div><button type="button" class="blog-carousel-btn blog-carousel-prev" aria-label="Previous slide">‹</button><button type="button" class="blog-carousel-btn blog-carousel-next" aria-label="Next slide">›</button><div class="blog-carousel-dots"></div></div>`;
  });
}

/** Strip pending placeholders before public render. */
export function stripPendingBlocks(md: string): string {
  return md
    .replace(new RegExp(String.raw`:::carousel${DIM_SUFFIX}?\n[\s\S]*?:::`, "g"), (block) => {
      const slides = block
        .split("\n")
        .slice(1, -1)
        .map((l) => parseImageLine(l))
        .filter((s) => s && !isPendingImage(s.alt, s.url));
      if (!slides.length) return "";
      const open = block.match(new RegExp(String.raw`^:::carousel${DIM_SUFFIX}?`))?.[0] ?? ":::carousel";
      return `${open}\n${slides.map((s) => `![${s!.alt}](${s!.url})${dimSuffix(s!.w, s!.h)}`).join("\n")}\n:::`;
    })
    .replace(new RegExp(String.raw`^!\[([^\]]*)\]\(([^)]*)\)(?:${DIM_SUFFIX})?\n?`, "gm"), (line, alt, url) =>
      isPendingImage(alt, url) ? "" : line
    );
}

export function createBlogMarked() {
  return new Marked({
    renderer: {
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const safe = href ? sanitizeMarkdownUrl(href, "link") : null;
        if (!safe) return text;
        const t = title ? ` title="${escapeAttr(title)}"` : "";
        return `<a href="${safe}" rel="noopener noreferrer" target="_blank"${t}>${text}</a>`;
      },
      image({ href, title, text }) {
        const safe = href ? sanitizeMarkdownUrl(href, "image") : null;
        if (!safe) return `<em>${text || "image"}</em>`;
        const t = title ? ` title="${escapeAttr(title)}"` : "";
        return `<img src="${safe}" alt="${escapeAttr(text)}" loading="lazy"${t} />`;
      },
      code({ text, lang }) {
        const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
        const highlighted = hljs.highlight(text, { language }).value;
        return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>\n`;
      },
    },
  });
}

export function renderBlogMarkdown(md: string): string {
  const cleaned = stripPendingBlocks(md);
  const expanded = expandButtons(expandCarousels(expandSizedImages(cleaned)));
  const html = createBlogMarked().parse(expanded) as string;
  return sanitizeMarkdownHtml(html);
}

export function blockAtCursor(md: string, cursor: number): ContentBlock | null {
  return parseContentBlocks(md).find((b) => cursor >= b.start && cursor <= b.end) ?? null;
}
