"use client";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  error: unknown;
  retry: () => void;
};

export default function Error({ retry }: ErrorBoundaryProps) {
  return (
    <main id="main-content" className="flex flex-1 items-center py-24">
      <Container className="max-w-xl">
        <BrandLogo />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          This page could not be loaded. Please try again.
        </p>
        <Button className="mt-8" onClick={() => retry()}>
          Try again
        </Button>
      </Container>
    </main>
  );
}
