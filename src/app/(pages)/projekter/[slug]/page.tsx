import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import ProjectPageClient from "@/features/projects/components/ProjectPageClient";
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
