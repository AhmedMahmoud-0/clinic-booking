import { BrandLogo } from "@/components/brand/brand-logo";
import { Container } from "@/components/layout/container";

function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <Container className="flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
        <BrandLogo className="text-base" />
        <p className="text-sm text-muted-foreground">
          Demo project using synthetic data only.
        </p>
      </Container>
    </footer>
  );
}

export { PublicFooter };
