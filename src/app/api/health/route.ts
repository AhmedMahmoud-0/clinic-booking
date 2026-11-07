import { NextResponse } from "next/server";
import { isDatabaseHealthy } from "@/server/health/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const healthy = await isDatabaseHealthy();

  return NextResponse.json(
    healthy
      ? { status: "ok", database: "ok" }
      : { status: "degraded", database: "unavailable" },
    {
      status: healthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
