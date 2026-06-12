import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAccountSessionId } from "@/features/accounts/services/auth/session";
import PostEditorScreen from "@/features/admin/components/PostEditorScreen";
import { getPost, postOwnedByAccount } from "@/features/blog/services/posts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Edit: ${slug} – Author` };
}

export default async function AuthorEditPostPage({ params }: Props) {
  const { slug } = await params;
  const accountId = await getAccountSessionId();
  const post = await getPost(slug);

  if (!post || !accountId || !postOwnedByAccount(post, accountId)) {
    notFound();
  }

  return (
    <PostEditorScreen
      backHref="/author/editor"
      eyebrow="Editing"
      heading={post.title}
      mode="edit"
      apiBase="/api/author/posts"
      uploadPath="/api/author/images"
      afterSavePath="/author/editor"
      authorsFetchPath="/api/author/posts/authors"
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
