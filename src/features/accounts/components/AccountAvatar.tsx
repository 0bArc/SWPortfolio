"use client";

import { useState } from "react";

type Props = {
  username: string;
  displayName: string;
  icon: string | null;
  size?: number;
  className?: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function AccountAvatar({
  username,
  displayName,
  icon,
  size = 36,
  className = "",
}: Props) {
  const [broken, setBroken] = useState(false);
  const dim = { width: size, height: size };

  if (icon && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 self-start rounded-full border border-white/10 object-cover bg-white/5 ${className}`}
        style={dim}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`shrink-0 self-start rounded-full border border-white/10 flex items-center justify-center bg-white/10 text-[11px] font-bold text-gray-300 ${className}`}
      style={dim}
      aria-label={displayName}
      title={username}
    >
      {initials(displayName)}
    </div>
  );
}
