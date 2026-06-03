import { Suspense } from "react";
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import AboutMe from "@/components/site/AboutMe";
import Experience from "@/components/site/Experience";
import ProjectsClient from "@/components/site/ProjectsClient";
import Footer from "@/components/site/FooterWrapper";
import LoadingScreen from "@/components/site/LoadingScreen";
import ScrollReveal from "@/components/site/ScrollReveal";
import { getRepoList } from "@/lib/github";
import { fetchOG } from "@/lib/og";

async function ReposContent() {
  let repos: Awaited<ReturnType<typeof getRepoList>> = [];
  try {
    repos = await getRepoList();
  } catch {
    // empty grid on failure
  }
  return <ProjectsClient repos={repos} />;
}

async function ExperienceContent() {
  const url = process.env.NEXT_PUBLIC_FEATURED_WORK;
  const og = url ? await fetchOG(url) : null;
  return <Experience og={og} />;
}

function ExperienceSkeleton() {
  return (
    <section id="arbeid" className="mb-20">
      <div className="h-4 w-32 bg-white/5 rounded mb-8 animate-pulse" />
      <div className="glass p-6 rounded-2xl h-36 animate-pulse" />
    </section>
  );
}

function ProjectsSkeleton() {
  return (
    <section id="prosjekter">
      <div className="h-4 w-32 bg-white/5 rounded mb-8 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass p-5 rounded-xl h-24 animate-pulse" />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <LoadingScreen />
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <Hero />
        <AboutMe />
        <Suspense fallback={<ExperienceSkeleton />}>
          <ExperienceContent />
        </Suspense>
        <Suspense fallback={<ProjectsSkeleton />}>
          <ReposContent />
        </Suspense>
      </main>
      <Footer />
      <ScrollReveal />
    </>
  );
}
