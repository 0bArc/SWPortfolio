import { Suspense } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminIdleGuard from "@/components/admin/AdminIdleGuard";
import { getIdleConfig } from "@/lib/session-idle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const idleConfig = getIdleConfig();

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="fixed left-0 top-0 h-full w-60 bg-[#0a0a0a] border-r border-white/5" />}>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 min-h-screen" style={{ marginLeft: "240px" }}>
        <Suspense>{children}</Suspense>
      </main>
      <AdminIdleGuard config={idleConfig} />
    </div>
  );
}
