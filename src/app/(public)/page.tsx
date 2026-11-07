import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function PlatformPreview() {
  return (
    <Card className="w-full">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium">Clinic workspace</CardTitle>
          <Badge variant="outline">Preview</Badge>
        </div>
        <CardDescription>Illustrative interface only. No live data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-3" aria-hidden="true">
          <div className="h-14 rounded-lg bg-accent" />
          <div className="h-14 rounded-lg bg-secondary/50" />
          <div className="h-14 rounded-lg bg-muted" />
        </div>
        <Separator />
        <div className="space-y-3" aria-hidden="true">
          <div className="h-3 w-1/3 rounded-full bg-muted" />
          <div className="h-3 w-full rounded-full bg-muted" />
          <div className="h-3 w-5/6 rounded-full bg-muted" />
          <div className="h-3 w-2/3 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="flex-1">
      <section className="py-16 sm:py-20 lg:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <Badge variant="secondary">Outpatient clinic platform</Badge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              A calmer way to run an outpatient clinic.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              MERUNO is being built as a single place for appointments, patient
              records, and the daily work of a multi-specialty clinic.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              This is a portfolio demo. It uses synthetic data only, and clinical
              workflows are not available yet.
            </p>
          </div>
          <div className="min-w-0">
            <PlatformPreview />
          </div>
        </Container>
      </section>
    </main>
  );
}
