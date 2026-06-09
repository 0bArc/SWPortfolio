import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Link as LinkIcon,
  Users,
  BookOpen,
  ExternalLink,
  GitCommitHorizontal,
} from "lucide-react";
import { getUserProfile, getUserContributions, type WeekActivity } from "@/lib/github";
import { translations, get } from "@/lib/i18n";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import ContributionGrid from "@/features/projects/components/ContributionGrid";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Profile – ${process.env.NEXT_PUBLIC_SITE_OWNER ?? "Portfolio"}`,
};

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.1.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.8 1.31 3.48 1 .11-.77.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.16 0 0 1.01-.32 3.3 1.23a11.53 11.53 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.64.25 2.86.12 3.16.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.22.69.82.58A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

async function ProfilContent() {
  let profile: Awaited<ReturnType<typeof getUserProfile>> | null = null;
  let contributions: WeekActivity[] = [];
  const t = (path: string) => get(translations, path);
  const dateLocale = translations.dateLocale;

  try {
    [profile, contributions] = await Promise.all([
      getUserProfile(),
      getUserContributions(),
    ]);
  } catch {
    // handled below
  }

  const totalContributions = contributions.reduce((s, w) => s + w.total, 0);
  const last52 = contributions.slice(-52);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      {profile ? (
        <>
          <div className="flex items-start gap-6 mb-10 flex-wrap">
            <div className="relative shrink-0">
              <Image
                src={profile.avatar_url}
                alt={profile.login}
                width={96}
                height={96}
                sizes="96px"
                className="rounded-full border border-white/10"
                priority
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050505]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {profile.name ?? profile.login}
                </h1>
                <span className="text-sm text-gray-500 font-mono">@{profile.login}</span>
              </div>
              {profile.bio && (
                <p className="text-gray-400 text-sm leading-relaxed mb-3 max-w-xl">
                  {profile.bio}
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-gray-300">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {profile.location}
                  </span>
                )}
                {profile.blog && (
                  <Link
                    href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <LinkIcon className="w-3.5 h-3.5" /> {profile.blog}
                  </Link>
                )}
                {profile.twitter_username && (
                  <Link
                    href={`https://twitter.com/${profile.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    𝕏 @{profile.twitter_username}
                  </Link>
                )}
                <span className="flex items-center gap-1">
                  {t("profile.joined")} {fmt(profile.created_at)}
                </span>
              </div>
            </div>

            <Link
              href={profile.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2 shrink-0"
            >
              <GithubIcon className="w-4 h-4" />
              GitHub <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {[
              { icon: BookOpen, label: t("profile.repos"), value: profile.public_repos },
              { icon: Users, label: t("profile.followers"), value: profile.followers },
              { icon: Users, label: t("profile.following"), value: profile.following },
              { icon: GitCommitHorizontal, label: t("profile.commits"), value: totalContributions },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass p-4 rounded-xl flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {last52.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-4 mb-5">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">
                  {t("profile.contributions")}
                </h2>
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-xs text-gray-600">
                  {totalContributions} {t("profile.commits").toLowerCase()}
                </span>
              </div>
              <div className="glass p-5 rounded-xl">
                <ContributionGrid weeks={last52} />
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="text-center py-24 text-gray-600">
          <p className="text-sm">{t("profile.noData")}</p>
        </div>
      )}
    </main>
  );
}

export default function ProfilPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<main className="max-w-4xl mx-auto px-6 pt-24 pb-16" />}>
        <ProfilContent />
      </Suspense>
      <Footer />
    </>
  );
}
