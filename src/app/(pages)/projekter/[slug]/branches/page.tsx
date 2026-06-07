import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitBranch,
  ShieldCheck,
  GitCommitHorizontal,
  ExternalLink,
} from "lucide-react";
import { getBranches, getBranchCommits, getRepoData, type Commit } from "@/lib/github";
import { getLang } from "@/lib/lang";
import { translations, get } from "@/lib/i18n";
import Navbar from "@/components/site/NavbarWrapper";
import Footer from "@/components/site/FooterWrapper";
import CommitList from "@/components/site/CommitList";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ branch?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} / branches – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}` };
}

async function BranchesContent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ branch?: string }> }) {
  const [{ slug }, { branch: selectedBranch }, lang] = await Promise.all([params, searchParams, getLang()]);
  const t = (path: string) => get(translations[lang], path);
  let branches;
  let detail;
  try {
    [branches, { detail }] = await Promise.all([
      getBranches(slug),
      getRepoData(slug),
    ]);
  } catch {
    notFound();
  }

  const defaultBranch = detail.default_branch;
  const activeBranch = selectedBranch ?? defaultBranch;

  const sorted = [
    ...branches.filter((b) => b.name === defaultBranch),
    ...branches
      .filter((b) => b.name !== defaultBranch)
      .sort((a, b) => a.name.localeCompare(b.name)),
  ];

  let branchCommits: Commit[] = [];
  try {
    branchCommits = await getBranchCommits(slug, activeBranch);
  } catch {
    // leave empty
  }

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
        <Link
          href="/#prosjekter"
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("project.projects")}
        </Link>
        <span>/</span>
        <Link
          href={`/projekter/${slug}`}
          className="hover:text-white transition-colors"
        >
          {slug}
        </Link>
        <span>/</span>
        <span className="text-gray-300">branches</span>
      </div>

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <GitBranch className="w-7 h-7 text-gray-500" />
            Branches
          </h1>
          <p className="text-gray-500 text-sm">
            {slug} · {branches.length} branch{branches.length !== 1 ? "es" : ""}
          </p>
        </div>
        <Link
          href={`${detail.html_url}/branches`}
          target="_blank"
          rel="noopener noreferrer"
          className="glass px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          GitHub
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-1.5">
          {sorted.map((branch) => {
            const isActive = branch.name === activeBranch;
            const isDefault = branch.name === defaultBranch;
            return (
              <Link
                key={branch.name}
                href={`/projekter/${slug}/branches?branch=${encodeURIComponent(branch.name)}`}
                className={`flex items-start gap-2.5 p-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-white/8 border border-white/15"
                    : "glass card-hover border border-transparent"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-gray-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold text-white truncate">
                    {branch.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {isDefault && (
                      <span className="text-[8px] bg-white/10 border border-white/20 px-1 py-0.5 rounded uppercase font-bold text-gray-200 tracking-wider">
                        default
                      </span>
                    )}
                    {branch.protected && (
                      <span className="text-[8px] text-gray-400 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> protected
                      </span>
                    )}
                    <span className="text-[8px] font-mono text-gray-400">
                      {branch.commit.sha.slice(0, 7)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div>
          <div className="flex items-center gap-3 mb-5">
            <GitCommitHorizontal className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
              Commits
            </h2>
            <span className="text-xs font-mono text-gray-300">{activeBranch}</span>
            <div className="h-px flex-1 bg-white/5" />
            <Link
              href={`${detail.html_url}/commits/${encodeURIComponent(activeBranch)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-500 hover:text-white transition-colors flex items-center gap-1"
            >
              {t("project.seeAll")} <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <CommitList commits={branchCommits} repoUrl={detail.html_url} />
        </div>
      </div>
    </main>
  );
}

function BranchesSkeleton() {
  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      <div className="h-3 w-48 bg-white/5 rounded mb-8 animate-pulse" />
      <div className="h-8 w-40 bg-white/5 rounded mb-10 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-1.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass p-3 rounded-xl h-14 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass p-4 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function BranchesPage({ params, searchParams }: Props) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<BranchesSkeleton />}>
        <BranchesContent params={params} searchParams={searchParams} />
      </Suspense>
      <Footer />
    </>
  );
}
