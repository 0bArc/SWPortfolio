import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/FooterWrapper";
import ProjectPageClient from "@/components/site/ProjectPageClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}` };
}

export default function ProjectPage() {
  return (
    <>
      <Navbar />
      <ProjectPageClient />
      <Footer />
    </>
  );
}
