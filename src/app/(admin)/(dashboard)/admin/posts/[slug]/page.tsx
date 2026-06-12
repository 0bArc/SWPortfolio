import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost } from "@/features/blog/services/posts";
import PostEditorScreen from "@/features/admin/components/PostEditorScreen";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Edit: ${slug} – Admin` };
}

export default async function EditPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <PostEditorScreen
      backHref="/admin/posts"
      eyebrow="Editing"
      heading={post.title}
      mode="edit"
      initial={{
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        featuredImage: post.featuredImage ?? "",
        content: post.content,
        tags: post.tags.join(", "),
        author: post.author,
        accountId: post.accountId,
        status: post.status,
        date: post.date,
      }}
    />
  );
}
