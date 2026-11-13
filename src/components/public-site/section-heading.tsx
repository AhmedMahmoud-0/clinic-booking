export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  const centered = align === "center";

  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#52837D]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#243B3B] sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-[#687A77] sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function PublicPageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-[#E8EEED] bg-white">
      <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-14 sm:px-7 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#52837D]">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.1] tracking-[-0.045em] text-[#243B3B] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-[#687A77] sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
