import type { Metadata } from "next";
import UserManagement from "@/components/admin/UserManagement";

export const metadata: Metadata = { title: "Users – Admin" };

export default function AdminUsersPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Community</p>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-sm text-gray-600 mt-1">Manage accounts, badges, and privacy settings.</p>
      </div>
      <UserManagement />
    </div>
  );
}
