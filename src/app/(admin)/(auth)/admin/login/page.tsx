import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import LoginForm from "./LoginForm";
import { getAdminBridgeInfo } from "@/features/admin/services/bridge";
import { getAdminSession } from "@/features/admin/services/auth";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage() {
  await connection();
  if (await getAdminSession()) redirect("/admin");
  const bridge = await getAdminBridgeInfo();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm mb-8 text-center">
        <Link href="/" className="text-sm font-semibold text-white hover:text-gray-300 transition-colors">
          kristiansen.icu
        </Link>
        <p className="text-[11px] text-gray-500 mt-2">Admin</p>
      </div>
      <div className="w-full max-w-sm">
        <LoginForm bridge={bridge} />
      </div>
    </main>
  );
}
