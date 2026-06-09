"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Lock, User, AtSign, Mail, CheckCircle2 } from "lucide-react";
import TurnstileWidget from "./TurnstileWidget";
import { useAccountSession } from "@/providers/AccountSessionProvider";

type Mode = "signup" | "login";

type Props = {
  mode: Mode;
  turnstileSiteKey?: string;
  requireEmail?: boolean;
};

export default function AccountAuthForm({ mode, turnstileSiteKey, requireEmail = false }: Props) {
  const router = useRouter();
  const { setAccount } = useAccountSession();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const isSignup = mode === "signup";
  const endpoint = isSignup ? "/api/accounts/signup" : "/api/accounts/login";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (isSignup && !captchaToken) {
      setError("Complete the captcha first");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, string> = {
        username: username.trim().toLowerCase(),
        password,
      };
      if (isSignup) {
        body.displayName = displayName.trim();
        body.captchaToken = captchaToken;
        if (requireEmail) body.email = email.trim();
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        emailVerificationRequired?: boolean;
        account?: {
          username: string;
          displayName: string;
          icon: string | null;
          emailVerified?: boolean;
        };
      };
      if (res.ok && data.emailVerificationRequired) {
        setVerificationSent(true);
      } else if (res.ok && data.account) {
        setAccount(data.account);
        router.push(`/u/${data.account.username}`);
        router.refresh();
      } else {
        setError(data.error ?? `Request failed (${res.status})`);
        setPassword("");
        setCaptchaToken("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-white/25 transition-colors";

  if (verificationSent) {
    return (
      <div className="glass rounded-2xl border border-white/[0.1] overflow-hidden shadow-2xl shadow-black/40 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
        <h1 className="text-lg font-semibold mt-4">Check your email</h1>
        <p className="text-sm text-gray-400 mt-2">
          We sent a verification link to <span className="text-gray-200">{email}</span>.
          Confirm it, then sign in.
        </p>
        <Link
          href="/account/login"
          className="inline-block mt-6 h-10 px-5 leading-10 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl border border-white/[0.1] overflow-hidden shadow-2xl shadow-black/40">
      <div className="px-7 pt-7 pb-5 border-b border-white/[0.06] bg-white/[0.01]">
        <h1 className="text-lg font-semibold tracking-tight">
          {isSignup ? "Create account" : "Sign in"}
        </h1>
        <p className="text-[12px] text-gray-500 mt-1">
          {isSignup
            ? "Comment on posts and get your own profile. Add a photo from your profile after sign-up."
            : "Welcome back."}
        </p>
      </div>

      <div className="p-7 space-y-4">
        <div>
          <label htmlFor="acct-username" className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Username
          </label>
          <div className="relative mt-1.5">
            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            <input
              id="acct-username"
              type="text"
              className={`${inputClass} pl-9`}
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
        </div>

        {isSignup && requireEmail && (
          <div>
            <label htmlFor="acct-email" className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Email
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <input
                id="acct-email"
                type="email"
                className={`${inputClass} pl-9`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>
        )}

        {isSignup && (
          <div>
            <label htmlFor="acct-display" className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Display name
            </label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              <input
                id="acct-display"
                type="text"
                className={`${inputClass} pl-9`}
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="acct-password" className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Password
          </label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            <input
              id="acct-password"
              type="password"
              className={`${inputClass} pl-9`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={8}
            />
          </div>
        </div>

        {isSignup && turnstileSiteKey && (
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            onToken={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
          />
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/[0.08] px-3.5 py-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full h-11 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:pointer-events-none mt-1"
          disabled={loading || !username || !password || (isSignup && !displayName) || (isSignup && requireEmail && !email)}
        >
          {loading ? "Working…" : isSignup ? "Create account" : "Sign in"}
        </button>

        <p className="text-center text-[12px] text-gray-500">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/account/login" className="text-gray-300 hover:text-white underline-offset-2 hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              No account yet?{" "}
              <Link href="/account/signup" className="text-gray-300 hover:text-white underline-offset-2 hover:underline">
                Sign up
              </Link>
            </>
          )}
        </p>
      </div>
    </form>
  );
}
