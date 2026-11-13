import type { ReactNode } from "react";

import { PublicSiteFooter } from "./public-site-footer";
import { PublicSiteHeader } from "./public-site-header";

export function PublicSiteLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-clip bg-[#F5F8F7] text-[#243B3B]"
      style={{ maxWidth: "100vw", overflowX: "clip" }}
    >
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-4 py-3 text-sm font-semibold text-[#176B67] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <PublicSiteHeader />
      <div className="min-w-0 w-full max-w-full flex-1">{children}</div>
      <PublicSiteFooter />
    </div>
  );
}
