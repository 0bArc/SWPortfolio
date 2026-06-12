import { Suspense } from "react";
import { connection } from "next/server";
import AdminSidebar from "@/features/admin/components/AdminSidebar";
import AdminIdleGuard from "@/features/admin/components/AdminIdleGuard";
import { getIdleConfig } from "@/features/admin/services/session-idle";
import { resolveAdminActor } from "@/features/accounts/services/permissions/actor";
import { canAccessAdminSettings } from "@/features/accounts/services/permissions/resolve";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const idleConfig = getIdleConfig();
  const actor = await resolveAdminActor();
  const showSettings =
    actor.kind === "full" ||
    (actor.kind === "account" && canAccessAdminSettings(actor.slugs, actor.username));

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Suspense fallback={<div className="hidden md:block fixed left-0 top-0 h-full w-60 bg-[#0a0a0a] border-r border-white/5" />}>
        <AdminSidebar showSettings={showSettings} />
      </Suspense>
      <main className="flex-1 min-h-screen min-w-0 w-full pt-14 md:pt-0 md:ml-60">
        <Suspense>{children}</Suspense>
      </main>
      <AdminIdleGuard config={idleConfig} />
    </div>
  );
}
