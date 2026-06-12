import { Suspense } from "react";

export default function StaffShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#050505]">
      {sidebar}
      <main className="flex-1 min-h-screen min-w-0 w-full pt-14 md:pt-0 md:ml-60">
        <Suspense>{children}</Suspense>
      </main>
    </div>
  );
}
