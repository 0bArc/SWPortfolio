import type { Metadata } from "next";
import IconReviewPanel from "@/features/admin/components/IconReviewPanel";
import UnverifiedUsersPanel from "@/features/admin/components/UnverifiedUsersPanel";
import UserManagement from "@/features/admin/components/UserManagement";
import { resolveAdminActor } from "@/features/accounts/services/permissions/actor";
import { canManageAdminUsers } from "@/features/admin/services/access";

export const metadata: Metadata = { title: "Users – Admin" };

export default async function AdminUsersPage() {
  const actor = await resolveAdminActor();
  const showUserAdminTools = canManageAdminUsers(actor);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Community</p>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          {showUserAdminTools
            ? "Manage accounts, badges, and privacy settings."
            : "Moderate community members — staff accounts are hidden from this list."}
        </p>
      </div>
      {showUserAdminTools && <UnverifiedUsersPanel />}
      {showUserAdminTools && <IconReviewPanel />}
      <UserManagement />
    </div>
  );
}
