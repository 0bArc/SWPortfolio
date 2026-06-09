"use client";

import { useState } from "react";
import { Mail, AlertCircle } from "lucide-react";
import { useAccountSession } from "@/providers/AccountSessionProvider";

export default function EmailVerificationBanner() {
  const { account, refresh } = useAccountSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!account || account.emailVerified !== false) return null;

  async function resend() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/accounts/resend-verification", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setMessage("Verification email sent. Check your inbox.");
        await refresh();
      } else {
        setError(data.error ?? "Could not resend email");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <Mail className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-amber-100 font-medium">Verify your email</p>
          <p className="text-[12px] text-amber-200/80 mt-0.5">
            {account.email
              ? `We sent a link to ${account.email}. Confirm before commenting.`
              : "Confirm your email before commenting."}
          </p>
          {message && <p className="text-[12px] text-emerald-300 mt-1">{message}</p>}
          {error && (
            <p className="text-[12px] text-red-300 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={loading}
        className="shrink-0 h-9 px-3 rounded-lg border border-amber-400/30 text-[12px] font-medium text-amber-100 hover:bg-amber-500/10 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Resend email"}
      </button>
    </div>
  );
}
