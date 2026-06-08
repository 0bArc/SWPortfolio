import Navbar from "@/components/site/NavbarWrapper";
import Footer from "@/components/site/FooterWrapper";

export const metadata = { title: `About – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}` };

export default function OmPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-6">About me</h1>
        <div className="glass p-6 rounded-2xl text-sm leading-relaxed text-gray-300 space-y-4">
          <p>
            My main interests are programming, backend development, and security, with an emphasis on
            writing secure and maintainable code.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
