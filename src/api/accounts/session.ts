import { getAccountSession } from "@/lib/accounts/auth";

export async function handleSession(): Promise<Response> {
  const account = await getAccountSession();
  if (!account) {
    return Response.json({ account: null });
  }
  return Response.json({ account });
}
