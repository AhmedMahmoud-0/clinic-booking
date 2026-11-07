import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Container } from "@/components/layout/container";

function PublicHeader() {
  return (
    <header className="border-b border-border bg-card">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="MERUNO Medical Clinics home"
          className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <BrandLogo />
        </Link>
        <p className="hidden text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase sm:block">
          Outpatient Clinic
        </p>
      </Container>
    </header>
  );
}

export { PublicHeader };
