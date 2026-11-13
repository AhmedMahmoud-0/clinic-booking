import Link from "next/link";

import { PublicIcon } from "@/components/public-site/public-icon";

export default function PublicNotFound() {
  return <main id="main-content" className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-5 py-20 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#52837D]">404 · Page not found</p><h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-[#243B3B] sm:text-5xl">This page is not available</h1><p className="mt-5 max-w-xl text-base leading-8 text-[#71817D]">The link may be incorrect, or the page may no longer be part of the public clinic catalogue.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#176B67] px-6 text-sm font-semibold text-white">Back to home <PublicIcon name="arrow" size={16} /></Link><Link href="/specialties" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D5E2DE] bg-white px-6 text-sm font-semibold text-[#34514D]">Browse specialties</Link></div></main>;
}
