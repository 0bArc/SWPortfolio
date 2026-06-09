"use client";

import { useState } from "react";

type Props = {
  bio: string;
  isOwner: boolean;
  onSave?: (bio: string) => Promise<void>;
};

export default function ProfileDescription({ bio, isOwner, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const display = bio.trim();

  if (!isOwner && !display) return null;

  async function save() {
    if (!onSave) return;
    setSaving(true);
    setError("");
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-400 mb-2">Description</h2>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Tell others about yourself…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-white/25 resize-y min-h-[5rem]"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-7 px-3 rounded-md bg-white text-black text-xs font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(bio);
                setEditing(false);
                setError("");
              }}
              disabled={saving}
              className="h-7 px-3 rounded-md border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-xs text-gray-500 ml-auto">{draft.length}/500</span>
          </div>
          {error && <p className="text-[11px] text-red-400/90 mt-1.5">{error}</p>}
        </div>
      ) : display ? (
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{display}</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setEditing(true);
          }}
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Add a description…
        </button>
      )}
      {isOwner && !editing && display && (
        <button
          type="button"
          onClick={() => {
            setDraft(bio);
            setEditing(true);
          }}
          className="text-xs text-gray-400 hover:text-gray-200 mt-2 transition-colors"
        >
          Edit description
        </button>
      )}
    </section>
  );
}
