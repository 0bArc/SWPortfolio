import Navbar from "@/components/site/layout/NavbarWrapper";
import Footer from "@/components/site/layout/FooterWrapper";
import AccountAuthForm from "@/components/site/account/AccountAuthForm";
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
