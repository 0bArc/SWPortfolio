import { Suspense } from "react";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  return (
    <Suspense
      fallback={
        <nav
          style={{ top: "var(--banner-h, 0px)" }}
          className="fixed w-full z-50 glass border-b border-white/[0.06] h-14"
        />
      }
    >
      <Navbar />
    </Suspense>
  );
}
