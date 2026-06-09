import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/NavbarWrapper";
import Footer from "@/components/layout/FooterWrapper";
import AccountProfilePanel from "@/features/accounts/components/AccountProfilePanel";
import PublicProfileView from "@/features/accounts/components/PublicProfileView";
import StaffPanel from "@/features/accounts/components/StaffPanel";
import { getProfileView } from "@/database/accounts";
import { getAccountSession, getAccountSessionId } from "@/features/accounts/services/auth/session";
import { canUseStaffPanel, resolvePermissions } from "@/features/accounts/services/permissions/resolve";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username.toLowerCase()}`,
  };
}

function ProfileFallback() {
  return (
    <main className="max-w-3xl mx-auto px-6 md:px-10 pt-24 pb-10">
      <div className="glass rounded-2xl border border-white/[0.1] p-6 sm:p-8 animate-pulse">
        <div className="flex items-start gap-5">
          <div className="w-[72px] h-[72px] rounded-full bg-white/[0.06]" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 bg-white/[0.06] rounded" />
            <div className="h-4 w-24 bg-white/[0.04] rounded" />
            <div className="h-3 w-32 bg-white/[0.04] rounded" />
          </div>
        </div>
        <div className="mt-8 h-40 bg-white/[0.03] rounded-lg" />
      </div>
    </main>
  );
}

async function ProfileContent({ params }: { params: Promise<{ username: string }> }) {
  const { username: raw } = await params;
  const username = raw.toLowerCase();
  const [session, sessionId] = await Promise.all([getAccountSession(), getAccountSessionId()]);
  const profile = await getProfileView(username, session?.username);
  if (!profile) notFound();

  if (profile.isPrivate) {
    return (
      <main className="max-w-3xl mx-auto px-6 md:px-10 pt-24 pb-10">
        <div className="glass rounded-2xl border border-white/[0.1] p-6 sm:p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-300">Private profile</h1>
          <p className="text-sm text-gray-500 mt-2">This member has opted out of a public profile.</p>
          <Link href="/blog" className="inline-block mt-6 text-sm text-gray-300 hover:text-white underline-offset-2 hover:underline">
            Browse posts
          </Link>
        </div>
      </main>
    );
  }

  const { account, badges, featuredBadge, history, isOwner, settings } = profile;
  const viewerPerms =
    sessionId && session
      ? await resolvePermissions(sessionId, session.username)
      : new Set<import("@/features/accounts/services/permissions/resolve").Permission>();
  const canStaffPanel =
    !isOwner &&
    !!sessionId &&
    !!session &&
    canUseStaffPanel(viewerPerms);
  const joined = new Date(account.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main
      className={`mx-auto px-6 md:px-10 pt-24 pb-10 ${canStaffPanel ? "max-w-5xl" : "max-w-3xl"}`}
    >
      <div className={`flex flex-col gap-5 ${canStaffPanel ? "lg:flex-row lg:items-start" : ""}`}>
        <div className="flex-1 min-w-0 glass rounded-2xl border border-white/[0.1] p-6 sm:p-8">
          {isOwner ? (
            <AccountProfilePanel
              account={account}
              joined={joined}
              badges={badges}
              history={history}
              showBadgesPublic={settings.showBadges}
              showHistoryPublic={settings.showCommentHistory}
            />
          ) : (
            <PublicProfileView
              account={account}
              joined={joined}
              badges={badges}
              featuredBadge={featuredBadge}
              history={history}
              showBadgesPublic={settings.showBadges}
              showHistoryPublic={settings.showCommentHistory}
            />
          )}
        </div>

        {canStaffPanel && (
          <div className="w-full lg:w-80 shrink-0">
            <StaffPanel targetUsername={account.username} />
          </div>
        )}
      </div>
    </main>
  );
}

export default function UserProfilePage({ params }: Props) {
  return (
    <>
      <Navbar />
      <Suspense fallback={<ProfileFallback />}>
        <ProfileContent params={params} />
      </Suspense>
      <Footer />
    </>
  );
}
