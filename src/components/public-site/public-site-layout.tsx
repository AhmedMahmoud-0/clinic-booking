import type { ReactNode } from "react";

import { PublicSiteFooter } from "./public-site-footer";
import { PublicSiteHeader } from "./public-site-header";

export function PublicSiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full min-w-0 max-w-full flex-col overflow-x-hidden bg-[#F5F8F7] text-[#243B3B]">
      <PublicSiteHeader />
      <div className="min-w-0 w-full flex-1">{children}</div>
      <PublicSiteFooter />
    </div>
  );
}
