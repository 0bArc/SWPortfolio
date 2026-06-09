import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import AccountAuthForm from "@/features/accounts/components/AccountAuthForm";
import { captchaConfigured, turnstileSiteKey } from "@/features/accounts/services/auth/captcha";
import { mailConfigured } from "@/lib/mail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  const siteKey = turnstileSiteKey();
  const ready = captchaConfigured();
  const requireEmail = mailConfigured();

  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto px-6 pt-24 pb-16">
        {ready && siteKey ? (
          <AccountAuthForm mode="signup" turnstileSiteKey={siteKey} requireEmail={requireEmail} />
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
