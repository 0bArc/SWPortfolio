import { redirect } from "next/navigation";
import { resolveAdminActor } from "@/features/accounts/services/permissions/actor";
import { canAccessAdminCms } from "@/features/admin/services/access";

export async function requireAdminCmsPage(): Promise<void> {
  const actor = await resolveAdminActor();
  if (!canAccessAdminCms(actor)) {
    redirect("/admin/users");
  }
}
