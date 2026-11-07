import { cn } from "cn";

type BrandLogoProps = {
  className?: string;
};

function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span
      data-slot="brand-logo"
      className={cn(
        "font-heading text-lg font-semibold tracking-tight text-primary",
        className
      )}
    >
      MERUNO
    </span>
  );
}

export { BrandLogo };
