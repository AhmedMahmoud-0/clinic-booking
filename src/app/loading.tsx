import { BrandLogo } from "@/components/brand/brand-logo";
import { Container } from "@/components/layout/container";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col">
      <span className="sr-only">Loading page</span>
      <Container className="py-20 sm:py-24">
        <BrandLogo />
        <div aria-hidden="true" className="mt-8">
          <div className="h-5 w-28 rounded bg-muted" />
          <div className="mt-8 h-12 w-full max-w-2xl rounded bg-muted" />
          <div className="mt-4 h-12 w-4/5 max-w-xl rounded bg-muted" />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
            <div className="h-48 rounded-xl bg-muted" />
          </div>
        </div>
      </Container>
    </div>
  );
}
