import type { Metadata } from "next";
import MediaGalleryPanel from "@/features/admin/components/MediaGalleryPanel";
import { requireAdminCmsPage } from "@/features/admin/services/cms-guard";

export const metadata: Metadata = { title: "Media – Admin" };

export default async function AdminMediaPage() {
  await requireAdminCmsPage();
  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
          Moderation
        </p>
        <h1 className="text-2xl font-bold text-white">Media gallery</h1>
        <p className="text-sm text-gray-600 mt-1">
          All tracked uploads — avatars, blog images, approval history.
        </p>
      </div>
      <MediaGalleryPanel />
    </div>
  );
}
