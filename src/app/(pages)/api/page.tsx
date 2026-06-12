import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import ApiConsole from "@/features/api/components/ApiConsole";
import { getAccountSessionId } from "@/features/accounts/services/auth/session";
import { siteConfig } from "@api-config";

export const metadata: Metadata = {
  title: `API – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
};

export default async function ApiPage() {
  const accountId = await getAccountSessionId();
  if (!accountId) {
    redirect("/account/login?next=/api");
  }

  const origin = siteConfig.siteUrl;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Developers</p>
          <h1 className="text-2xl font-bold text-white">API</h1>
          <p className="text-sm text-gray-500 mt-2">
            Manage keys and browse endpoints. Need an account?{" "}
            <Link href="/account/signup" className="text-gray-300 hover:text-white underline-offset-2 hover:underline">
              Sign up
            </Link>
            .
          </p>
        </div>
        <ApiConsole siteOrigin={origin} />
      </main>
      <Footer />
    </>
  );
}
