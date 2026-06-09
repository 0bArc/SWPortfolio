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
      type="button"
      className={`admin-btn admin-btn--icon ${confirming ? "admin-btn--danger" : "admin-btn--outline"}`}
      onClick={handleClick}
      disabled={loading}
      title={confirming ? "Click again to confirm delete" : "Delete post"}
      aria-label={confirming ? "Confirm delete" : "Delete post"}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
