const configuredBaseUrl = process.env.HEALTH_BASE_URL ?? "http://localhost:3000";

let endpoint;

try {
  const baseUrl = new URL(configuredBaseUrl);

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("Unsupported protocol");
  }

  endpoint = new URL("/api/health", baseUrl);
} catch {
  console.error(
    "Health check configuration is invalid. HEALTH_BASE_URL must be an HTTP or HTTPS base URL.",
  );
  process.exitCode = 1;
}

if (endpoint) {
  let response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    console.error(
      "Health endpoint could not be reached. Start the Next.js server and verify its local port.",
    );
    process.exitCode = 1;
  }

  if (response) {
    const payload = await response.json().catch(() => null);
    const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
    const hasNoStore = cacheControl.includes("no-store");

    if (
      response.status === 200 &&
      payload?.status === "ok" &&
      payload?.database === "ok" &&
      hasNoStore
    ) {
      console.log("MERUNO health check passed.");
      console.log("HTTP status: 200");
      console.log("Database: ok");
      console.log("Cache-Control: no-store");
    } else if (
      response.status === 503 &&
      payload?.status === "degraded" &&
      payload?.database === "unavailable"
    ) {
      console.error("The health endpoint is responding, but the database is unavailable.");
      console.error("HTTP status: 503");
      if (!hasNoStore) {
        console.error("Cache-Control is missing the no-store directive.");
      }
      process.exitCode = 2;
    } else {
      console.error("Health endpoint returned an unexpected response.");
      console.error(`HTTP status: ${response.status}`);
      console.error(`Cache-Control: ${hasNoStore ? "no-store" : "missing no-store"}`);
      process.exitCode = 1;
    }
  }
}
