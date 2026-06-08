import { Suspense } from "react";
import Footer from "./Footer";

export default function FooterWrapper() {
  return (
    <Suspense fallback={null}>
      <Footer />
    </Suspense>
  );
}
