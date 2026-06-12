import type { Metadata } from "next";
import { connection } from "next/server";
import AuditLogsPanel from "@/features/admin/components/AuditLogsPanel";

export const metadata: Metadata = { title: "Audit Logs – Admin" };

export default async function AdminAuditPage() {
  await connection();

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
          Administration
        </p>
        <h1 className="text-2xl font-bold text-white">Audit logs</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Staff actions recorded automatically from the centralized event system.
        </p>
      </div>
      <AuditLogsPanel />
    </div>
  );
}
