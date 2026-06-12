"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { API_V1_ENDPOINTS } from "@/features/api/catalog";
import { networkJson, NetworkError } from "@/lib/network/client";

type ApiKeyItem = {
  id: number;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

const AUTH_LABELS = {
  api_key: "API key",
  session: "Session",
  public: "Public",
} as const;

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

export default function ApiConsole({ siteOrigin }: { siteOrigin: string }) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);

  const loadKeys = useCallback(async () => {
    setError("");
    try {
      const data = await networkJson<{ keys: ApiKeyItem[] }>("/api/accounts/api-keys");
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof NetworkError ? err.message : "Could not load keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function handleCreate() {
    setCreating(true);
    setError("");
    setRevealedSecret(null);
    try {
      const data = await networkJson<{ key: ApiKeyItem; secret: string }>("/api/accounts/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() || "Default" }),
      });
      setKeys((prev) => [data.key, ...prev]);
      setRevealedSecret(data.secret);
      setNewName("");
    } catch (err) {
      setError(err instanceof NetworkError ? err.message : "Could not create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number) {
    setRevoking(id);
    setError("");
    try {
      await networkJson(`/api/accounts/api-keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof NetworkError ? err.message : "Could not revoke key");
    } finally {
      setRevoking(null);
    }
  }

  const exampleCurl = revealedSecret
    ? `curl -H "Authorization: Bearer ${revealedSecret}" ${siteOrigin}/api/v1/me`
    : `curl -H "Authorization: Bearer kn_…" ${siteOrigin}/api/v1/me`;

  return (
    <div className="space-y-8">
      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">API keys</p>
        <p className="text-sm text-gray-500 mb-4 max-w-2xl">
          Create keys to call <span className="font-mono text-gray-400">/api/v1/*</span> from scripts or
          apps. Send{" "}
          <span className="font-mono text-gray-400">Authorization: Bearer &lt;key&gt;</span> or{" "}
          <span className="font-mono text-gray-400">X-API-Key</span>. Rate limits apply per IP, key, and
          account (429 + <span className="font-mono text-gray-400">Retry-After</span>).
        </p>
        <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200 mb-1">Cloudflare</p>
          <p className="text-amber-100/80 text-[13px] leading-relaxed">
            If <span className="font-mono">curl https://…/api/v1/me</span> returns HTML &quot;Just a
            moment…&quot;, Cloudflare bot fight is blocking API traffic — not this app. In Cloudflare:
            add a rule to <strong>skip JS challenge</strong> when URI path starts with{" "}
            <span className="font-mono">/api/v1/</span>. On the server, test origin with{" "}
            <span className="font-mono">curl -H &quot;Authorization: Bearer …&quot; http://127.0.0.1:PORT/api/v1/me</span>.
          </p>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Key name (e.g. CI, local dev)"
              className="admin-input flex-1"
              maxLength={64}
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="admin-btn admin-btn--primary admin-btn--md shrink-0 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating…" : "Create key"}
            </button>
          </div>

          {revealedSecret && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold text-amber-200 mb-2">Copy now — shown once</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono text-gray-300 break-all">{revealedSecret}</code>
                <button
                  type="button"
                  onClick={() => void copyText(revealedSecret)}
                  className="shrink-0 p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
                  aria-label="Copy key"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {loading ? (
            <p className="text-sm text-gray-600">Loading keys…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              No active keys yet.
            </p>
          ) : (
            <div className="divide-y divide-white/5 -mx-1">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between gap-4 py-3 px-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{key.name}</p>
                    <p className="text-[11px] font-mono text-gray-600 mt-0.5">
                      {key.prefix}… · created {fmtDate(key.createdAt)} · last used {fmtDate(key.lastUsedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(key.id)}
                    disabled={revoking === key.id}
                    className="shrink-0 p-2 rounded-lg border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-40"
                    aria-label={`Revoke ${key.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Example</p>
          <pre className="text-[11px] font-mono text-gray-400 overflow-x-auto whitespace-pre-wrap break-all">
            {exampleCurl}
          </pre>
        </div>
      </section>

      <section>
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Endpoints</p>
        <div className="glass rounded-xl overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[5rem_1fr_6rem_1.2fr] gap-3 px-5 py-3 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            <span>Method</span>
            <span>Path</span>
            <span>Auth</span>
            <span>Description</span>
          </div>
          <div className="divide-y divide-white/5">
            {API_V1_ENDPOINTS.map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="px-5 py-4 md:grid md:grid-cols-[5rem_1fr_6rem_1.2fr] md:gap-3 md:items-start"
              >
                <span className="text-[11px] font-bold font-mono text-sky-400">{ep.method}</span>
                <code className="block text-[11px] font-mono text-gray-300 mt-1 md:mt-0 break-all">{ep.path}</code>
                <span className="block text-[10px] uppercase tracking-wider text-gray-500 mt-2 md:mt-0">
                  {AUTH_LABELS[ep.auth]}
                </span>
                <p className="text-sm text-gray-500 mt-1 md:mt-0">{ep.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
