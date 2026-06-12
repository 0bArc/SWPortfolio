import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PostEditor from "@/features/admin/components/PostEditor";
import type { PostData } from "@/features/admin/components/PostEditor";

export interface PostEditorScreenProps {
  backHref: string;
  backLabel?: string;
  eyebrow: string;
  heading: string;
  mode: "create" | "edit";
  initial?: Partial<PostData>;
  pickAuthor?: boolean;
  apiBase?: string;
  uploadPath?: string;
  afterSavePath?: string;
  authorsFetchPath?: string;
}

export default function PostEditorScreen({
  backHref,
  backLabel = "Posts",
  eyebrow,
  heading,
  mode,
  initial,
  pickAuthor = true,
  apiBase,
  uploadPath,
  afterSavePath,
  authorsFetchPath,
}: PostEditorScreenProps) {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors mb-4"
        >
          <ChevronLeft className="w-3 h-3" /> {backLabel}
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-bold text-white">{heading}</h1>
      </div>
      <PostEditor
        mode={mode}
        initial={initial}
        pickAuthor={pickAuthor}
        apiBase={apiBase}
        uploadPath={uploadPath}
        afterSavePath={afterSavePath}
        authorsFetchPath={authorsFetchPath}
      />
    </div>
  );
}
