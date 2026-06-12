import type { Metadata } from "next";
import { getAccountSession, getAccountSessionId } from "@/features/accounts/services/auth/session";
import PostEditorScreen from "@/features/admin/components/PostEditorScreen";

export const metadata: Metadata = { title: "New post – Author" };

export default async function AuthorNewPostPage() {
  const [session, accountId] = await Promise.all([
    getAccountSession(),
    getAccountSessionId(),
  ]);

  return (
    <PostEditorScreen
      backHref="/author/editor"
      eyebrow="New post"
      heading="Create post"
      mode="create"
      apiBase="/api/author/posts"
      uploadPath="/api/author/images"
      afterSavePath="/author/editor"
      authorsFetchPath="/api/author/posts/authors"
      initial={{
        author: session?.displayName ?? "",
        accountId: accountId ?? null,
      }}
    />
  );
}
