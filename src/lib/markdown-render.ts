import { Marked } from "marked";
import hljs from "highlight.js";
import { sanitizeMarkdownHtml, sanitizeMarkdownUrl } from "./markdown-urls";

const CAROUSEL_RE = /:::carousel\n([\s\S]*?):::/g;

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}

function expandCarousels(md: string): string {
  return md.replace(CAROUSEL_RE, (_, body: string) => {
    const slides = body
      .trim()
      .split("\n")
      .map((line) => {
        const m = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (!m) return "";
        const safe = sanitizeMarkdownUrl(m[2], "image");
        if (!safe) return "";
        return `<figure class="blog-carousel-slide"><img src="${safe}" alt="${escapeAttr(m[1])}" loading="lazy" /></figure>`;
      })
      .filter(Boolean);

    if (!slides.length) return "";
    return `<div class="blog-carousel" data-carousel><div class="blog-carousel-track">${slides.join("")}</div><button type="button" class="blog-carousel-btn blog-carousel-prev" aria-label="Previous slide">‹</button><button type="button" class="blog-carousel-btn blog-carousel-next" aria-label="Next slide">›</button><div class="blog-carousel-dots"></div></div>`;
  });
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
  const expanded = expandCarousels(md);
  const html = createBlogMarked().parse(expanded) as string;
  return sanitizeMarkdownHtml(html);
}
