import Navbar from "@/components/site/layout/NavbarWrapper";
import Footer from "@/components/site/layout/FooterWrapper";
import AccountAuthForm from "@/components/site/account/AccountAuthForm";
import { captchaConfigured } from "@/lib/accounts/captcha";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const ready = captchaConfigured();

  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto px-6 pt-24 pb-16">
        {ready && siteKey ? (
          <AccountAuthForm mode="signup" turnstileSiteKey={siteKey} />
        ) : (
          <div className="glass rounded-2xl border border-white/[0.1] p-7 text-center">
            <p className="text-sm text-gray-400">Sign-up is not available yet. Captcha keys are not configured.</p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
