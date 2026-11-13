import { expect, test } from "@playwright/test";

test("System Admin workspace redirects anonymous page requests to login", async ({ request }) => {
  for (const route of [
    "/system-admin",
    "/system-admin/users",
    "/system-admin/roles",
    "/system-admin/master-data",
    "/system-admin/schedules",
    "/system-admin/settings",
    "/system-admin/audit-logs",
  ]) {
    // Server Component redirects can be streamed as HTML with a meta refresh,
    // which correctly returns HTTP 200 after the response has started.
    const response = await request.get(route, { maxRedirects: 0, headers: { Accept: "text/html" } });

    if (response.status() === 307) {
      const location = response.headers().location;
      expect(location, `${route} must provide a login redirect`).toBeTruthy();
      expect(new URL(location!, response.url()).pathname).toBe("/login");
      continue;
    }

    expect(response.status(), `${route} must redirect anonymous users`).toBe(200);
    const html = await response.text();
    expect(html, `${route} must emit a streamed login redirect`).toMatch(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/i);
    expect(html, `${route} must redirect to /login`).toMatch(/url=\/?login(?:[?"'\s;]|$)/i);
  }
});

test("System Admin APIs reject anonymous access without caching", async ({ request }) => {
  for (const route of [
    "/api/system-admin/overview",
    "/api/system-admin/users",
    "/api/system-admin/roles",
    "/api/system-admin/audit-logs",
    "/api/system-admin/schedules",
  ]) {
    const response = await request.get(route);
    expect(response.status(), `${route} should reject anonymous access`).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
