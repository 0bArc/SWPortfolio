import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Admin – kristiansen.icu" };

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
            kristiansen.icu
          </p>
          <h1 className="text-xl font-bold text-white">Admin</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
