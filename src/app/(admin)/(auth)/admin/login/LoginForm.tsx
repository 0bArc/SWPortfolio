"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Shield, User } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <form onSubmit={handleSubmit} className="glass rounded-2xl border border-white/[0.1] overflow-hidden shadow-2xl shadow-black/40">
      <div className="px-7 pt-7 pb-5 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
          <Shield className="h-3.5 w-3.5 text-gray-600" />
          HMAC-signed session · 7-day max
        </div>
      </div>

      <div className="p-7 space-y-5">
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

        <button
          type="submit"
          className="admin-btn admin-btn--primary admin-btn--lg w-full h-11 mt-1"
          disabled={loading || !username || !password}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
