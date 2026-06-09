import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Admin sign in" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm mb-8 text-center">
        <Link href="/" className="text-sm font-semibold text-white hover:text-gray-300 transition-colors">
          kristiansen.icu
        </Link>
        <p className="text-[11px] text-gray-500 mt-2">Admin</p>
      </div>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
