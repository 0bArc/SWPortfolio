import Navbar from "@/components/site/layout/NavbarWrapper";
import Footer from "@/components/site/layout/FooterWrapper";
import ProjectPageClient from "@/components/site/project/ProjectPageClient";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}` };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  return (
    <>
      <Navbar />
      <ProjectPageClient slug={slug} />
      <Footer />
    </>
  );
}
