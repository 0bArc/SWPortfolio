"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeletePostButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/posts/${slug}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        confirming
          ? "text-red-400 bg-red-500/10"
          : "text-gray-700 hover:text-red-400 hover:bg-red-500/5"
      }`}
      title={confirming ? "Click again to confirm delete" : "Delete post"}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
