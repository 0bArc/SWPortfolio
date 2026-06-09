"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import AccountAvatar from "@/features/accounts/components/AccountAvatar";
import {
  countComments,
  postComment,
  syncComments,
  syncSession,
  type CommentNode,
  type SessionAccount,
  deleteComment,
  onNetworkRefresh,
  syncPermissions,
} from "@/lib/network/synchronize";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CommentComposer({
  account,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  account: SessionAccount;
  placeholder: string;
  submitLabel: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    setError("");
    setLoading(true);
    try {
      await onSubmit(trimmed);
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-3 items-start">
        <div className="w-8 h-8 shrink-0">
          <AccountAvatar
            username={account.username}
            displayName={account.displayName}
            icon={account.icon}
            size={32}
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={2000}
          autoFocus={autoFocus}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-white/25 resize-y min-h-[64px]"
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-2 pl-[44px]">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="h-8 px-3 rounded-lg bg-white text-black text-xs font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? "Posting…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function CommentItem({
  comment,
  postSlug,
  depth,
  account,
  replyingTo,
  onReply,
  onPosted,
  canModerate,
  onDelete,
}: {
  comment: CommentNode;
  postSlug: string;
  depth: number;
  account: SessionAccount | null;
  replyingTo: number | null;
  onReply: (id: number | null) => void;
  onPosted: () => Promise<void>;
  canModerate: boolean;
  onDelete: (id: number) => Promise<void>;
}) {
  return (
    <li className={depth > 0 ? "mt-3" : undefined}>
      <div className={`flex gap-3 ${depth > 0 ? "pl-9" : ""}`}>
        <Link
          href={`/u/${comment.author.username}`}
          className="block w-8 h-8 shrink-0 self-start"
        >
          <AccountAvatar
            username={comment.author.username}
            displayName={comment.author.displayName}
            icon={comment.author.icon}
            size={32}
          />
        </Link>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={`/u/${comment.author.username}`}
              className="text-sm font-semibold text-white hover:text-gray-200"
            >
              {comment.author.displayName}
            </Link>
            <span className="text-xs text-gray-400">@{comment.author.username}</span>
            <span className="text-xs text-gray-400">· {fmtDate(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-200 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {account && (
              <button
                type="button"
                onClick={() => onReply(replyingTo === comment.id ? null : comment.id)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {replyingTo === comment.id ? "Cancel reply" : "Reply"}
              </button>
            )}
            {canModerate && (
              <button
                type="button"
                onClick={() => void onDelete(comment.id)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-300 transition-colors"
                title="Delete comment"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
          {account && replyingTo === comment.id && (
            <div className="mt-3">
              <CommentComposer
                account={account}
                placeholder={`Reply to ${comment.author.displayName}…`}
                submitLabel="Post reply"
                autoFocus
                onCancel={() => onReply(null)}
                onSubmit={async (content) => {
                  await postComment(postSlug, content, comment.id);
                  onReply(null);
                  await onPosted();
                }}
              />
            </div>
          )}
        </div>
      </div>
      {comment.replies.length > 0 && (
        <ul className="mt-2 ml-4 border-l border-white/[0.1] pl-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postSlug={postSlug}
              depth={depth + 1}
              account={account}
              replyingTo={replyingTo}
              onReply={onReply}
              onPosted={onPosted}
              canModerate={canModerate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PostComments({ postSlug }: { postSlug: string }) {

  const [comments, setComments] = useState<CommentNode[]>([]);
  const [account, setAccount] = useState<SessionAccount | null | undefined>(undefined);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [topError, setTopError] = useState("");
  const [canModerate, setCanModerate] = useState(false);

  const refresh = useCallback(async () => {
    if (!postSlug) return;
    const [nodes, session, perms] = await Promise.all([
      syncComments(postSlug),
      syncSession(),
      syncPermissions().catch(() => [] as string[]),
    ]);
    setComments(nodes);
    setAccount(session);
    setCanModerate(
      perms.includes("comments:moderate") || perms.includes("admin:users")
    );
  }, [postSlug]);

  async function handleDelete(commentId: number) {
    if (!confirm("Delete this comment and its replies?")) return;
    await deleteComment(commentId);
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const off = onNetworkRefresh("comments", () => void refresh(), { postSlug });
    return off;
  }, [postSlug, refresh]);

  const total = countComments(comments);

  async function handleTopLevelSubmit(content: string) {
    if (!postSlug) return;
    setTopError("");
    try {
      await postComment(postSlug, content);
      await refresh();
    } catch (err) {
      setTopError(err instanceof Error ? err.message : "Could not post comment");
      throw err;
    }
  }

  if (!postSlug) return null;

  return (
    <section className="mt-12 pt-8 border-t border-white/[0.12]">
      <h2 className="text-lg font-semibold mb-6">
        Comments {total > 0 && <span className="text-gray-400 font-normal">({total})</span>}
      </h2>

      {account === undefined ? (
        <div className="h-20 animate-pulse rounded-lg bg-white/[0.03]" />
      ) : account ? (
        <div className="mb-8">
          <CommentComposer
            account={account}
            placeholder="Write a comment…"
            submitLabel="Post comment"
            onSubmit={handleTopLevelSubmit}
          />
          {topError && <p className="text-xs text-red-400 mt-2">{topError}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-8">
          <Link href="/account/login" className="text-gray-300 hover:text-white underline-offset-2 hover:underline">
            Sign in
          </Link>
          {" or "}
          <Link href="/account/signup" className="text-gray-300 hover:text-white underline-offset-2 hover:underline">
            create an account
          </Link>
          {" to comment."}
        </p>
      )}

      <ul className="space-y-5">
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            postSlug={postSlug}
            depth={0}
            account={account ?? null}
            replyingTo={replyingTo}
            onReply={setReplyingTo}
            onPosted={refresh}
            canModerate={canModerate}
            onDelete={handleDelete}
          />
        ))}
        {comments.length === 0 && (
          <li className="text-sm text-gray-400">No comments yet. Be the first.</li>
        )}
      </ul>
    </section>
  );
}
