import { redirect } from "next/navigation";
import { getAccountSession, getAccountSessionId } from "@/features/accounts/services/auth/session";
import { hasPermission, resolvePermissions } from "@/features/accounts/services/permissions/resolve";
import StaffShell from "@/features/admin/components/StaffShell";
import AuthorSidebar from "@/features/admin/components/AuthorSidebar";

export default async function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, sessionId] = await Promise.all([getAccountSession(), getAccountSessionId()]);
  if (!sessionId || !session) {
    redirect("/account/login?next=/author");
  }

  const perms = await resolvePermissions(sessionId, session.username);
  if (!hasPermission(perms, "posts:write")) {
    redirect("/account/login?next=/author");
  }

  return (
    <StaffShell sidebar={<AuthorSidebar />}>
      {children}
    </StaffShell>
  );
}
