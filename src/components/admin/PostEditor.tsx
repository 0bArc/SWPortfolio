"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

const markedInstance = new Marked({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(text, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>\n`;
    },
  },
});

export interface PostData {
  slug?: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string;
  author: string;
  status: "draft" | "published";
  date: string;
}

interface PostEditorProps {
  initial?: Partial<PostData>;
  mode: "create" | "edit";
}

type ViewMode = "write" | "split" | "preview";

interface SlashMenu {
  active: boolean;
  slashPos: number;
  query: string;
  selectedIdx: number;
  coords: { top: number; left: number };
}

const SLASH_ITEMS = [
  { key: "h1",       label: "Heading 1",      tag: "H1",   insert: "# "             },
  { key: "h2",       label: "Heading 2",      tag: "H2",   insert: "## "            },
  { key: "h3",       label: "Heading 3",      tag: "H3",   insert: "### "           },
  { key: "code",     label: "Code block",     tag: "</>",  insert: "```\n\n```\n"   },
  { key: "quote",    label: "Quote",          tag: "❝",    insert: "> "             },
  { key: "divider",  label: "Divider",        tag: "—",    insert: "\n---\n\n"      },
  { key: "ul",       label: "Bullet list",    tag: "•",    insert: "- "             },
  { key: "ol",       label: "Numbered list",  tag: "1.",   insert: "1. "            },
  { key: "bold",     label: "Bold",           tag: "B",    insert: "**text**"       },
  { key: "italic",   label: "Italic",         tag: "I",    insert: "*text*"         },
  { key: "link",     label: "Link",           tag: "↗",    insert: "[text](url)"    },
  { key: "image",    label: "Image",          tag: "🖼",   insert: "![alt](url)"    },
];

function slugify(str: string) {
  return str.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

const MENU_W = 224;
const MENU_H = 280;

function getCaretCoords(el: HTMLTextAreaElement, caretPos: number) {
  const cs = window.getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || 20;
  const pt = parseFloat(cs.paddingTop) || 0;
  const pl = parseFloat(cs.paddingLeft) || 0;

  const linesBefore = el.value.slice(0, caretPos).split("\n").length - 1;
  const elRect = el.getBoundingClientRect();

  const rawTop  = elRect.top  + pt + linesBefore * lh - el.scrollTop + lh + 4;
  const rawLeft = elRect.left + pl;

  // Clamp so menu stays inside viewport
  const top  = Math.min(rawTop,  window.innerHeight - MENU_H - 8);
  const left = Math.min(rawLeft, window.innerWidth  - MENU_W - 8);

  return { top: Math.max(top, 8), left: Math.max(left, 8) };
}

// Returns slash command context if cursor is in a /... block at line start, else null
function detectSlash(value: string, cursor: number): { slashPos: number; query: string } | null {
  let i = cursor - 1;
  while (i >= 0 && value[i] !== "\n" && value[i] !== "/") i--;
  if (i < 0 || value[i] !== "/") return null;
  const prevChar = i > 0 ? value[i - 1] : "\n";
  if (prevChar !== "\n") return null;
  return { slashPos: i, query: value.slice(i + 1, cursor).toLowerCase() };
}

export default function PostEditor({ initial, mode }: PostEditorProps) {
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [view, setView] = useState<ViewMode>("write");
  const [form, setForm] = useState<PostData>({
    slug:    initial?.slug    ?? "",
    title:   initial?.title   ?? "",
    excerpt: initial?.excerpt ?? "",
    content: initial?.content ?? "",
    tags:    initial?.tags    ?? "",
    author:  initial?.author  ?? "Sander Kristiansen",
    status:  initial?.status  ?? "draft",
    date:    initial?.date    ?? new Date().toISOString().slice(0, 10),
  });
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [slash, setSlash] = useState<SlashMenu>({
    active: false, slashPos: 0, query: "", selectedIdx: 0,
    coords: { top: 0, left: 0 },
  });

  useEffect(() => {
    if (!slugEdited && form.title)
      setForm(p => ({ ...p, slug: slugify(p.title) }));
  }, [form.title, slugEdited]);

  const previewHtml = useMemo(
    () => markedInstance.parse(form.content || "") as string,
    [form.content]
  );

  const filteredItems = useMemo(() =>
    slash.query === ""
      ? SLASH_ITEMS
      : SLASH_ITEMS.filter(
          it => it.label.toLowerCase().includes(slash.query) || it.key.includes(slash.query)
        ),
    [slash.query]
  );

  function set<K extends keyof PostData>(key: K, value: PostData[K]) {
    setForm(p => ({ ...p, [key]: value }));
  }

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    set("content", value);
    const cursor = e.target.selectionStart ?? 0;
    const detected = detectSlash(value, cursor);
    if (detected) {
      const coords = getCaretCoords(e.target, detected.slashPos);
      setSlash(p => ({
        active: true,
        slashPos: detected.slashPos,
        query: detected.query,
        selectedIdx: 0,
        coords,
      }));
    } else {
      setSlash(p => ({ ...p, active: false }));
    }
  }, []);

  function insertSlashItem(item: typeof SLASH_ITEMS[number]) {
    const ta = taRef.current;
    if (!ta) return;
    const before = ta.value.slice(0, slash.slashPos);
    const after  = ta.value.slice(ta.selectionStart ?? slash.slashPos);
    const newVal = before + item.insert + after;
    set("content", newVal);
    setSlash(p => ({ ...p, active: false }));
    // Restore focus + move cursor to end of inserted text
    requestAnimationFrame(() => {
      ta.focus();
      const pos = slash.slashPos + item.insert.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!slash.active) return;
    const items = filteredItems;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSlash(p => ({ ...p, selectedIdx: Math.min(p.selectedIdx + 1, items.length - 1) }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSlash(p => ({ ...p, selectedIdx: Math.max(p.selectedIdx - 1, 0) }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (items[slash.selectedIdx]) insertSlashItem(items[slash.selectedIdx]);
    } else if (e.key === "Escape") {
      setSlash(p => ({ ...p, active: false }));
    }
  }

  // Close slash menu on outside click
  useEffect(() => {
    if (!slash.active) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setSlash(p => ({ ...p, active: false }));
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [slash.active]);

  async function handleSave(status: "draft" | "published") {
    setSaving(true);
    setSaveError("");
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const url =
        mode === "create"
          ? "/api/admin/posts"
          : `/api/admin/posts/${initial?.slug ?? form.slug}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags, status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Save failed (${res.status})`);
      }
      router.push("/admin/posts");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Title / Slug / Author */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="admin-label">Title</label>
          <input
            className="admin-input text-lg font-semibold"
            placeholder="Post title…"
            value={form.title}
            onChange={e => set("title", e.target.value)}
          />
        </div>
        <div>
          <label className="admin-label">Slug</label>
          <input
            className="admin-input font-mono text-sm"
            placeholder="post-slug"
            value={form.slug}
            onChange={e => { setSlugEdited(true); set("slug", e.target.value); }}
          />
        </div>
        <div>
          <label className="admin-label">Author</label>
          <input className="admin-input" value={form.author} onChange={e => set("author", e.target.value)} />
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className="admin-label">Excerpt</label>
        <textarea
          className="admin-input resize-none"
          rows={2}
          placeholder="Short description shown in listing…"
          value={form.excerpt}
          onChange={e => set("excerpt", e.target.value)}
        />
      </div>

      {/* Content area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="admin-label mb-0">
            Content
            <span className="text-gray-700 font-normal normal-case tracking-normal ml-1">
              — type <kbd className="px-1 py-0.5 rounded text-[10px] bg-white/5 text-gray-500 font-mono">/</kbd> for blocks
            </span>
          </label>
          {/* View mode tabs */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            {(["write", "split", "preview"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors capitalize ${
                  view === v ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Editor pane */}
        <div className={`relative flex gap-0 rounded-xl overflow-hidden border border-white/[0.08] ${view === "split" ? "divide-x divide-white/[0.08]" : ""}`}>
          {/* Textarea */}
          {view !== "preview" && (
            <textarea
              ref={taRef}
              className="flex-1 bg-white/[0.03] p-4 font-mono text-sm text-white leading-relaxed resize-none outline-none min-h-[280px] placeholder:text-gray-700"
              placeholder={"Start writing…\n\nType / at the start of a line for block options."}
              value={form.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              spellCheck={false}
            />
          )}

          {/* Preview pane */}
          {view !== "write" && (
            <div
              key={view}
              className="prose-blog preview-fade flex-1 p-6 overflow-y-auto min-h-[280px] bg-[#070707]"
              dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color:#374151;font-size:13px;font-style:italic">Nothing to preview yet.</p>' }}
              style={{ maxHeight: 280 }}
            />
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-700">Markdown / MDX</p>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="admin-label">Tags</label>
          <input
            className="admin-input"
            placeholder="rust, backend, web"
            value={form.tags}
            onChange={e => set("tags", e.target.value)}
          />
          <p className="mt-1 text-[11px] text-gray-700">Comma-separated</p>
        </div>
        <div>
          <label className="admin-label">Publish date</label>
          <input type="date" className="admin-input" value={form.date} onChange={e => set("date", e.target.value)} />
        </div>
        <div>
          <label className="admin-label">Status</label>
          <select className="admin-input" value={form.status} onChange={e => set("status", e.target.value as PostData["status"])}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <button onClick={() => router.back()} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Cancel
        </button>
        <div className="flex items-center gap-3">
          {saveError && (
            <p className="text-[12px] text-red-400 font-medium">{saveError}</p>
          )}
          <button
            disabled={saving}
            onClick={() => handleSave("draft")}
            className="px-5 py-2 text-sm font-medium rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            disabled={saving}
            onClick={() => handleSave("published")}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-white text-black hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </div>

      {/* Slash command menu — fixed portal */}
      {slash.active && filteredItems.length > 0 && (
        <div
          ref={menuRef}
          style={{ top: slash.coords.top, left: slash.coords.left, position: "fixed", zIndex: 9999, width: MENU_W }}
          className="slash-menu rounded-xl overflow-hidden border border-white/10 bg-[#111] shadow-2xl shadow-black/60"
        >
          <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Blocks
          </p>
          <div className="max-h-64 overflow-y-auto pb-1.5">
            {filteredItems.map((item, i) => (
              <button
                key={item.key}
                onMouseDown={e => { e.preventDefault(); insertSlashItem(item); }}
                className={`flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors text-left ${
                  i === slash.selectedIdx
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <span className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 text-[11px] font-bold text-gray-300 shrink-0 font-mono">
                  {item.tag}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
