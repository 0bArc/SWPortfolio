import { getAccountSession } from "@/features/accounts/services/auth/session";

export async function handleSession(): Promise<Response> {
  const account = await getAccountSession();
  if (!account) {
    return Response.json({ account: null });
  }
  return Response.json({ account });
}
