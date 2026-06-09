import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import AccountAuthForm from "@/features/accounts/components/AccountAuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-md mx-auto px-6 pt-24 pb-16">
        <AccountAuthForm mode="login" />
      </main>
      <Footer />
    </>
  );
}
