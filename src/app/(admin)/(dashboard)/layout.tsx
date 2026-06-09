import { Suspense } from "react";
import AdminSidebar from "@/features/admin/components/AdminSidebar";
import AdminIdleGuard from "@/features/admin/components/AdminIdleGuard";
import { getIdleConfig } from "@/features/admin/services/session-idle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const idleConfig = getIdleConfig();

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Suspense fallback={<div className="hidden md:block fixed left-0 top-0 h-full w-60 bg-[#0a0a0a] border-r border-white/5" />}>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 min-h-screen min-w-0 w-full pt-14 md:pt-0 md:ml-60">
        <Suspense>{children}</Suspense>
      </main>
      <AdminIdleGuard config={idleConfig} />
    </div>
  );
}
