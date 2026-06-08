import { handleDeleteSuppress } from "@/api/notifications";

interface Props {
  params: Promise<{ username: string }>;
}

export async function DELETE(_req: Request, { params }: Props) {
  const { username } = await params;
  return handleDeleteSuppress(username);
}
