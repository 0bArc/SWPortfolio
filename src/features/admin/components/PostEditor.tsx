"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  renderBlogMarkdown,
  parseContentBlocks,
  serializeImage,
  serializeCarousel,
  isPendingImage,
  PENDING_IMAGE_ALT,
  blockAtCursor,
  type ContentBlock,
} from "@/lib/markdown/render";
import { sanitizeMarkdownContent } from "@/lib/markdown/urls";
import BlogProse from "@/features/blog/components/BlogProse";
import EditorApiButton, { uploadEditorImages } from "@/features/admin/components/EditorApiButton";
import EditorBlockControls, { EditorSizeFields } from "@/features/admin/components/EditorBlockControls";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Pencil, X } from "lucide-react";
import TagInputPreview from "@/features/admin/components/TagInputPreview";

type UploadAction = "image" | "carousel" | "carousel-add";

interface SlashItem {
  key: string;
  label: string;
  tag: string;
  insert?: string;
  action?: UploadAction;
}

export interface PostData {
  slug?: string;
  title: string;
  excerpt: string;
  featuredImage: string;
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

interface SlashMenu {
  active: boolean;
  slashPos: number;
  query: string;
  selectedIdx: number;
  coords: { top: number; left: number };
}

const SLASH_ITEMS: SlashItem[] = [
  { key: "h1",       label: "Heading 1",      tag: "H1",   insert: "# "             },
  { key: "h2",       label: "Heading 2",      tag: "H2",   insert: "## "            },
  { key: "h3",       label: "Heading 3",      tag: "H3",   insert: "### "           },
  { key: "code",     label: "Code block",     tag: "</>",  insert: "```\n\n```\n"   },
  { key: "quote",    label: "Quote",          tag: "❝",    insert: "> "             },
  { key: "div",      label: "Divider",        tag: "—",    insert: "---\n"          },
  { key: "ul",       label: "Bullet list",    tag: "•",    insert: "- "             },
  { key: "ol",       label: "Numbered list",  tag: "1.",   insert: "1. "            },
  { key: "bold",     label: "Bold",           tag: "B",    insert: "**text**"       },
  { key: "italic",   label: "Italic",         tag: "I",    insert: "*text*"         },
  { key: "link",     label: "Link",           tag: "↗",    insert: "[text](https://)"    },
  { key: "button",   label: "Button",         tag: "Btn",  insert: "![button](https://)[text:Click me][color:white][position:center]\n" },
  { key: "image",    label: "Image",          tag: "🖼",   action: "image"          },
  { key: "carousel", label: "Carousel",       tag: "◫",    action: "carousel"       },
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

const IMAGE_PLACEHOLDER = `![${PENDING_IMAGE_ALT}]()\n`;
const CAROUSEL_PLACEHOLDER = `:::carousel\n![${PENDING_IMAGE_ALT}]()\n:::\n`;

const skeletonCls =
  "w-full min-h-[10rem] sm:min-h-[8rem] rounded-xl border-2 border-dashed border-white/20 bg-white/[0.04] flex items-center justify-center text-sm sm:text-xs font-medium text-gray-400 cursor-pointer hover:border-white/35 hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors";

function replaceRange(content: string, start: number, end: number, next: string) {
  return content.slice(0, start) + next + content.slice(end);
}

function EditorContentPreview({
  content,
  onChange,
  onRequestUpload,
  onAddCarouselSlides,
  uploading,
  className,
}: {
  content: string;
  onChange: (next: string) => void;
  onRequestUpload: (block: ContentBlock) => void;
  onAddCarouselSlides: (block: ContentBlock, files: File[]) => Promise<void>;
  uploading: boolean;
  className?: string;
}) {
  const blocks = useMemo(() => parseContentBlocks(content), [content]);

  function patchBlock(block: ContentBlock, raw: string) {
    onChange(replaceRange(content, block.start, block.end, raw));
  }

  const segments: ({ kind: "md"; html: string } | { kind: "block"; block: ContentBlock })[] = [];
  let last = 0;
  for (const block of blocks) {
    if (block.start > last) {
      segments.push({ kind: "md", html: renderBlogMarkdown(content.slice(last, block.start)) });
    }
    segments.push({ kind: "block", block });
    last = block.end;
  }
  if (last < content.length) {
    segments.push({ kind: "md", html: renderBlogMarkdown(content.slice(last)) });
  }

  if (!segments.length) {
    segments.push({ kind: "md", html: renderBlogMarkdown(content) });
  }

  return (
    <div
      className={cn(
        "prose-blog preview-fade flex-1 p-6 overflow-y-auto bg-[#070707]",
        className ?? "min-h-[280px] max-h-[280px]"
      )}
    >
      {segments.map((seg, i) => {
        if (seg.kind === "md") {
          return <BlogProse key={`md-${i}`} html={seg.html} className="prose-blog" />;
        }

        const block = seg.block;
        if (block.type === "image") {
          const pending = isPendingImage(block.alt, block.url);
          return (
            <div key={`img-${block.start}`} className="my-4 not-prose">
              {pending ? (
                <button
                  type="button"
                  className={`admin-btn admin-btn--outline admin-btn--sm ${skeletonCls} aspect-video w-full h-auto min-h-[10rem]`}
                  onClick={() => onRequestUpload(block)}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Tap to add image"}
                </button>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={block.url}
                  alt={block.alt}
                  className="rounded-xl border border-white/[0.07] max-w-full"
                  style={{
                    width: block.w ? `${block.w}px` : undefined,
                    height: block.h ? `${block.h}px` : undefined,
                  }}
                />
              )}
              <EditorSizeFields
                w={block.w}
                h={block.h}
                onW={(w) => patchBlock(block, serializeImage(block.alt, block.url, w, block.h))}
                onH={(h) => patchBlock(block, serializeImage(block.alt, block.url, block.w, h))}
              />
            </div>
          );
        }

        const pending =
          !block.slides.length ||
          block.slides.every((s) => isPendingImage(s.alt, s.url));
        const filled = block.slides.filter((s) => !isPendingImage(s.alt, s.url));

        return (
          <div key={`car-${block.start}`} className="my-4 not-prose">
            {pending ? (
              <button
                type="button"
                className={`admin-btn admin-btn--outline admin-btn--sm ${skeletonCls} aspect-video w-full h-auto min-h-[10rem]`}
                onClick={() => onRequestUpload(block)}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Tap to add carousel images"}
              </button>
            ) : (
              <BlogProse
                html={renderBlogMarkdown(
                  serializeCarousel(filled, block.w, block.h).trimEnd()
                )}
                className="prose-blog"
              />
            )}
            <EditorSizeFields
              label="Carousel size"
              w={block.w}
              h={block.h}
              onW={(w) =>
                patchBlock(
                  block,
                  serializeCarousel(pending ? block.slides : filled, w, block.h)
                )
              }
              onH={(h) =>
                patchBlock(
                  block,
                  serializeCarousel(pending ? block.slides : filled, block.w, h)
                )
              }
            />
            {!pending && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <EditorApiButton
                  multiple
                  disabled={uploading}
                  size="xs"
                  onUpload={(files) => onAddCarouselSlides(block, files)}
                >
                  Add slide
                </EditorApiButton>
                <span className="text-[11px] text-gray-500">
                  {filled.length} slide{filled.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PaneLabel({ children }: { children: string }) {
  return (
    <div className="px-3 py-1 border-b border-white/15 bg-white/[0.04] shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{children}</span>
    </div>
  );
}

export default function PostEditor({ initial, mode }: PostEditorProps) {
  const router = useRouter();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingBlock = useRef<{ start: number; end: number; action: UploadAction } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [editorCursor, setEditorCursor] = useState(0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [form, setForm] = useState<PostData>({
    slug:    initial?.slug    ?? "",
    title:   initial?.title   ?? "",
    excerpt: initial?.excerpt ?? "",
    featuredImage: initial?.featuredImage ?? "",
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

  useEffect(() => {
    if (contentModalOpen) {
      requestAnimationFrame(() => taRef.current?.focus());
    }
    if (!contentModalOpen) {
      setSlash((p) => ({ ...p, active: false }));
    }
  }, [contentModalOpen]);

  function openContentModal() {
    setContentModalOpen(true);
  }

  const activeBlock = useMemo(
    () => (contentModalOpen ? blockAtCursor(form.content, editorCursor) : null),
    [contentModalOpen, form.content, editorCursor]
  );

  const filteredItems = useMemo(
    () =>
      slash.query === ""
        ? SLASH_ITEMS
        : SLASH_ITEMS.filter(
            (it) =>
              it.label.toLowerCase().includes(slash.query) ||
              it.key.includes(slash.query)
          ),
    [slash.query]
  );

  const syncCursor = useCallback(() => {
    const ta = taRef.current;
    if (ta) setEditorCursor(ta.selectionStart ?? 0);
  }, []);

  function set<K extends keyof PostData>(key: K, value: PostData[K]) {
    setForm(p => ({ ...p, [key]: value }));
  }

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? 0;
    set("content", value);
    setEditorCursor(cursor);
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

  function applySlashItem(item: SlashItem) {
    const ta = taRef.current;
    if (!ta) return;
    const end = ta.selectionStart ?? slash.slashPos;

    if (item.action) {
      const before = ta.value.slice(0, slash.slashPos);
      const after = ta.value.slice(end);
      const insert = item.action === "image" ? IMAGE_PLACEHOLDER : CAROUSEL_PLACEHOLDER;
      set("content", before + insert + after);
      setSlash((p) => ({ ...p, active: false }));
      requestAnimationFrame(() => {
        ta.focus();
        const pos = slash.slashPos + insert.length;
        ta.setSelectionRange(pos, pos);
      });
      return;
    }

    if (!item.insert) return;
    const before = ta.value.slice(0, slash.slashPos);
    const after = ta.value.slice(end);
    const newVal = before + item.insert + after;
    set("content", newVal);
    setSlash((p) => ({ ...p, active: false }));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = slash.slashPos + item.insert!.length;
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
      if (items[slash.selectedIdx]) applySlashItem(items[slash.selectedIdx]);
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

  async function applyBlockUpload(files: File[], pending: { start: number; end: number; action: UploadAction }) {
    const uploaded = await uploadEditorImages(files);
    const slides = uploaded.map((u) => ({ alt: u.alt, url: u.url }));

    setForm((prev) => {
      let insert = "";
      if (pending.action === "image") {
        insert = serializeImage(slides[0].alt, slides[0].url);
      } else if (pending.action === "carousel-add") {
        const block = parseContentBlocks(prev.content).find((b) => b.start === pending.start);
        if (block?.type === "carousel") {
          const existing = block.slides.filter((s) => !isPendingImage(s.alt, s.url));
          insert = serializeCarousel([...existing, ...slides], block.w, block.h);
        }
      } else {
        insert = serializeCarousel(slides);
      }
      if (!insert) return prev;
      return {
        ...prev,
        content: replaceRange(prev.content, pending.start, pending.end, insert),
      };
    });
  }

  function requestBlockUpload(block: ContentBlock) {
    pendingBlock.current = {
      start: block.start,
      end: block.end,
      action: block.type === "image" ? "image" : "carousel",
    };
    if (!fileRef.current) return;
    fileRef.current.multiple = block.type === "carousel";
    fileRef.current.accept = "image/jpeg,image/png,image/webp,image/gif";
    fileRef.current.click();
  }

  async function handleAddCarouselSlides(block: ContentBlock, files: File[]) {
    setUploading(true);
    setSaveError("");
    try {
      await applyBlockUpload(files, {
        start: block.start,
        end: block.end,
        action: "carousel-add",
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const pending = pendingBlock.current;
    pendingBlock.current = null;
    if (!files.length || !pending) return;

    setUploading(true);
    setSaveError("");
    try {
      await applyBlockUpload(files, pending);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleFeaturedUpload(files: File[]) {
    const [uploaded] = await uploadEditorImages(files);
    set("featuredImage", uploaded.url);
  }

  async function handleSave(status: "draft" | "published") {
    setSaving(true);
    setSaveError("");
    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const content = sanitizeMarkdownContent(form.content);
      const url =
        mode === "create"
          ? "/api/admin/posts"
          : `/api/admin/posts/${initial?.slug ?? form.slug}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          content,
          tags,
          status,
          featuredImage: form.featuredImage || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Save failed (${res.status})`);
      }
      await router.push("/admin/posts");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Title / Slug / Author */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
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

      {/* Featured image + excerpt */}
      <div className="grid grid-cols-1 md:grid-cols-[9rem_1fr] gap-4">
        <div>
          <label className="admin-label">Featured image</label>
          {form.featuredImage ? (
            <div className="relative w-full aspect-square rounded-xl border border-white/25 bg-black overflow-hidden mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.featuredImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-square rounded-xl border border-dashed border-white/25 bg-black mb-2 flex items-center justify-center text-[11px] text-gray-400">
              No image
            </div>
          )}
          <EditorApiButton
            variant="outline"
            size="xs"
            disabled={featuredUploading}
            onUpload={async (files) => {
              setFeaturedUploading(true);
              setSaveError("");
              try {
                await handleFeaturedUpload(files);
              } catch (err) {
                setSaveError(err instanceof Error ? err.message : "Featured image upload failed");
              } finally {
                setFeaturedUploading(false);
              }
            }}
          >
            {form.featuredImage ? "Replace" : "Upload"}
          </EditorApiButton>
          {form.featuredImage && (
            <button
              type="button"
              className="admin-btn admin-btn--ghost admin-btn--xs mt-2"
              onClick={() => set("featuredImage", "")}
            >
              Remove
            </button>
          )}
        </div>
        <div>
          <label className="admin-label">Excerpt</label>
          <textarea
            className="admin-input resize-none h-full min-h-[9rem]"
            rows={4}
            placeholder="Short description shown in listing…"
            value={form.excerpt}
            onChange={e => set("excerpt", e.target.value)}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="pt-4 mt-1 border-t border-white/12">
        <label className="admin-label mb-2">
          Content
          <span className="hidden sm:inline text-gray-500 font-normal normal-case tracking-normal ml-1">
            — type <kbd className="px-1 py-0.5 rounded text-[10px] bg-white/8 text-gray-400 font-mono border border-white/15">/</kbd> for blocks
          </span>
        </label>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFilePick}
        />

        <div className="relative">
          <button
            type="button"
            onClick={openContentModal}
            className="w-full text-left rounded-xl border border-white/20 bg-white/[0.05] p-3 pr-[8.5rem] min-h-[5rem] hover:border-white/30 hover:bg-white/[0.07] transition-colors"
          >
            <p className="font-mono text-xs sm:text-sm text-gray-300 line-clamp-3 whitespace-pre-wrap leading-relaxed">
              {form.content || "Start writing…"}
            </p>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--outline admin-btn--xs absolute right-3 top-1/2 -translate-y-1/2"
            onClick={openContentModal}
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            Open editor
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          {uploading ? "Uploading…" : "Split editor — markdown left, live preview right"}
        </p>
      </div>

      <Dialog open={contentModalOpen} onOpenChange={setContentModalOpen}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
          className={cn(
            "glass flex flex-col gap-0 p-0 border-white/20 bg-[#050505] text-white overflow-hidden",
            "!fixed !inset-0 !translate-x-0 !translate-y-0 !max-w-none !w-full !h-[100dvh] !rounded-none",
            "sm:!inset-2 sm:!h-[calc(100dvh-1rem)] sm:!rounded-xl",
            "lg:!inset-4 lg:!max-w-[min(90rem,calc(100%-2rem))] lg:!left-1/2 lg:!right-auto lg:!-translate-x-1/2 lg:!w-full"
          )}
        >
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/15 shrink-0">
            <DialogTitle className="admin-label mb-0">
              Content
            </DialogTitle>
            <DialogClose
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Close editor"
            >
              <X className="w-4 h-4" />
            </DialogClose>
          </div>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 divide-y md:divide-y-0 md:divide-x divide-white/15">
            <div className="flex flex-col min-h-0 md:w-1/2">
              <PaneLabel>Edit</PaneLabel>
              <textarea
                ref={taRef}
                className="flex-1 min-h-[40vh] md:min-h-0 w-full bg-white/[0.04] p-3 sm:p-4 font-mono text-sm text-white leading-relaxed resize-none outline-none placeholder:text-gray-500 border-0"
                placeholder={"Start writing…\n\nType / at the start of a line for block options."}
                value={form.content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onSelect={syncCursor}
                onClick={syncCursor}
                spellCheck={false}
              />
              {activeBlock && (
                <EditorBlockControls
                  block={activeBlock}
                  uploading={uploading}
                  onPatch={(raw) =>
                    setForm((prev) => ({
                      ...prev,
                      content: replaceRange(prev.content, activeBlock.start, activeBlock.end, raw),
                    }))
                  }
                  onAddCarouselSlides={(files) => handleAddCarouselSlides(activeBlock, files)}
                />
              )}
            </div>
            <div className="flex flex-col min-h-0 md:w-1/2">
              <PaneLabel>Preview</PaneLabel>
              <EditorContentPreview
                content={form.content}
                uploading={uploading}
                onChange={(next) => set("content", next)}
                onRequestUpload={requestBlockUpload}
                onAddCarouselSlides={handleAddCarouselSlides}
                className="flex-1 min-h-[40vh] md:min-h-0 max-h-none p-3 sm:p-4"
              />
            </div>
          </div>

          <p className="px-3 py-1.5 text-[11px] text-gray-500 shrink-0 border-t border-white/15">
            {uploading
              ? "Uploading…"
              : "Type / for blocks — tap dashed boxes in preview to upload"}
          </p>
        </DialogContent>
      </Dialog>

      {/* Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="admin-label">Tags</label>
          <input
            className="admin-input"
            placeholder="development, update, rust"
            value={form.tags}
            onChange={e => set("tags", e.target.value)}
          />
          <TagInputPreview tags={form.tags} />
          <p className="mt-1 text-[11px] text-gray-500">Comma-separated · styled in <a href="/admin/tags" className="text-gray-400 hover:text-white underline">Tags</a></p>
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
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-white/12">
        <button type="button" className="admin-btn admin-btn--ghost admin-btn--md self-start" onClick={() => router.back()}>
          Cancel
        </button>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {saveError && (
            <p className="text-[12px] text-red-400 font-medium">{saveError}</p>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--outline admin-btn--lg"
            disabled={saving}
            onClick={() => handleSave("draft")}
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--lg"
            disabled={saving}
            onClick={() => handleSave("published")}
          >
            {saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </div>

      {/* Slash command menu — fixed portal */}
      {slash.active && filteredItems.length > 0 && (
        <div
          ref={menuRef}
          style={{ top: slash.coords.top, left: slash.coords.left, position: "fixed", zIndex: 10000, width: MENU_W }}
          className="slash-menu rounded-xl overflow-hidden border border-white/10 bg-[#111] shadow-2xl shadow-black/60"
        >
          <p className="px-3 pt-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Blocks
          </p>
          <div className="max-h-64 overflow-y-auto pb-1.5">
            {filteredItems.map((item, i) => (
              <button
                key={item.key}
                onMouseDown={e => { e.preventDefault(); applySlashItem(item); }}
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
