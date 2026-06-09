import type { Metadata } from "next";
import { listTagStyles } from "@/lib/tags/styles";
import TagStyleEditor from "@/features/admin/components/TagStyleEditor";

export const metadata: Metadata = { title: "Tags – Admin" };

export default async function TagsPage() {
  let styles: Awaited<ReturnType<typeof listTagStyles>> = [];
  try {
    styles = await listTagStyles();
  } catch {
    // DB unavailable
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Design</p>
        <h1 className="text-2xl font-bold text-white">Tag styles</h1>
        <p className="text-sm text-gray-600 mt-1">
          Gradient, glow, cryptic glitch, animation curves. Styles apply wherever tags render.
        </p>
      </div>
      <TagStyleEditor initial={styles} />
    </div>
  );
}
