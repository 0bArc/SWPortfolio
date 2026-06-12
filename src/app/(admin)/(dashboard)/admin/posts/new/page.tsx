import type { Metadata } from "next";
import PostEditorScreen from "@/features/admin/components/PostEditorScreen";

export const metadata: Metadata = { title: "New Post – Admin" };

export default function NewPostPage() {
  return (
    <PostEditorScreen
      backHref="/admin/posts"
      eyebrow="New post"
      heading="Create post"
      mode="create"
    />
  );
}
