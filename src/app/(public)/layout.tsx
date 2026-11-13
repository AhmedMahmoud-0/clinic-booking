import type { ReactNode } from "react";

import { PublicSiteLayout } from "@/components/public-site/public-site-layout";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicSiteLayout>{children}</PublicSiteLayout>;
}
