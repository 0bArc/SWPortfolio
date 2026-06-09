import { Suspense } from "react";
import Footer from "./Footer";

function FooterInner() {
  const siteOwner = process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio";
  const githubUser = process.env.NEXT_PUBLIC_GITHUB_USER ?? "";
  const featuredWork = process.env.NEXT_PUBLIC_FEATURED_WORK ?? "";

  return (
    <Footer
      siteOwner={siteOwner}
      githubUrl={githubUser ? `https://github.com/${githubUser}` : "https://github.com/"}
      featuredWork={featuredWork}
    />
  );
}

export default function FooterWrapper() {
  return (
    <Suspense fallback={null}>
      <FooterInner />
    </Suspense>
  );
}
