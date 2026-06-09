"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, User } from "lucide-react";

type BridgeInfo = { canBridge: boolean; username?: string; displayName?: string };

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bridge, setBridge] = useState<BridgeInfo | null>(null);

  useEffect(() => {
    void fetch("/api/admin/login", { credentials: "same-origin" })
      .then((r) => r.json() as Promise<BridgeInfo>)
      .then((data) => {
        if (data.canBridge && data.username) {
          setBridge(data);
          setUsername(data.username);
        }
      })
      .catch(() => {});
  }, []);

  async function continueAsSignedIn() {
    if (!bridge?.username) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: bridge.username, useSiteSession: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error ?? "Could not open admin panel");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error ?? `Login failed (${res.status})`);
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl border border-white/[0.1] p-7 space-y-5">
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Site account with Founder, Admin, or Dev role — or env admin credentials.
      </p>

      {bridge?.canBridge && (
        <button
          type="button"
          onClick={() => void continueAsSignedIn()}
          disabled={loading}
          className="w-full h-11 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {loading ? "Opening…" : `Continue as @${bridge.username}`}
        </button>
      )}
        <div>
          <label htmlFor="admin-username" className="admin-label">
            Username
          </label>
          <div className="relative mt-1.5">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            <input
              id="admin-username"
              type="text"
              className="admin-input pl-9 h-11"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label htmlFor="admin-password" className="admin-label">
            Password
          </label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            <input
              id="admin-password"
              type="password"
              className="admin-input pl-9 h-11"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/[0.08] px-3.5 py-3"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

      {bridge?.canBridge && (
        <p className="text-center text-[10px] text-gray-600 uppercase tracking-widest">or sign in with password</p>
      )}

      <button
        type="submit"
        className="w-full h-11 rounded-xl border border-white/15 text-sm font-semibold text-gray-200 hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
        disabled={loading || !username || !password}
      >
        {loading ? "Signing in…" : "Sign in with password"}
      </button>
    </form>
  );
}
