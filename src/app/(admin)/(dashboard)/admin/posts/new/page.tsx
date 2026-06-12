import type { Metadata } from "next";
import PostEditorScreen from "@/features/admin/components/PostEditorScreen";
import { requireAdminCmsPage } from "@/features/admin/services/cms-guard";

export const metadata: Metadata = { title: "New Post – Admin" };

export default async function NewPostPage() {
  await requireAdminCmsPage();
  return (
    <PostEditorScreen
      backHref="/admin/posts"
      eyebrow="New post"
      heading="Create post"
      mode="create"
    />
  );
}
