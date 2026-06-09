"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Missing verification token");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/accounts/verify-email?token=${encodeURIComponent(token)}`, {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          username?: string;
        };
        if (cancelled) return;
        if (res.ok && data.username) {
          setUsername(data.username);
          setState("ok");
        } else {
          setState("error");
          setError(data.error ?? "Verification failed");
        }
      } catch {
        if (!cancelled) {
          setState("error");
          setError("Something went wrong");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="glass rounded-2xl border border-white/[0.1] p-8 text-center max-w-md mx-auto">
      {state === "loading" && (
        <>
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-sm text-gray-400 mt-4">Verifying your email…</p>
        </>
      )}
      {state === "ok" && (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h1 className="text-lg font-semibold mt-4">Email verified</h1>
          <p className="text-sm text-gray-400 mt-2">You can sign in and use your account.</p>
          <Link
            href={username ? `/u/${username}` : "/account/login"}
            className="inline-block mt-6 h-10 px-5 leading-10 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-200"
          >
            Continue
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <h1 className="text-lg font-semibold mt-4">Verification failed</h1>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
          <Link
            href="/account/login"
            className="inline-block mt-6 text-sm text-gray-300 underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-6 pt-24 pb-16">
        <Suspense
          fallback={
            <div className="glass rounded-2xl border border-white/[0.1] p-8 text-center">
              <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
