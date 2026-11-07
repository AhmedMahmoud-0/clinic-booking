import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Container } from "@/components/layout/container";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main-content" className="flex flex-1 items-center py-24">
      <Container className="max-w-xl">
        <BrandLogo />
        <p className="mt-8 text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The page you are looking for does not exist or has moved.
        </p>
        <Link href="/" className={`${buttonVariants()} mt-8`}>
          Back to home
        </Link>
      </Container>
    </main>
  );
}
