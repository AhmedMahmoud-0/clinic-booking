"use client";

import "@fontsource-variable/inter";
import "./globals.css";

import { Button } from "@/components/ui/button";

type GlobalErrorProps = {
  error: unknown;
  retry: () => void;
};

export default function GlobalError({ retry }: GlobalErrorProps) {
  return (
    <html lang="en" dir="ltr" className="h-full antialiased">
      <head>
        <title>Something went wrong | MERUNO</title>
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <main id="main-content" className="flex flex-1 items-center px-4 py-24">
          <div className="mx-auto w-full max-w-xl">
            <p className="text-lg font-semibold tracking-tight text-primary">
              MERUNO
            </p>
            <h1 className="mt-8 text-3xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The application could not complete this request. Please try again.
            </p>
            <Button className="mt-8" onClick={() => retry()}>
              Try again
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
