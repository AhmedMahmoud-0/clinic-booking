import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected from every patient portal page to sign-in", async ({ page }) => {
  const routes = [
    "/portal",
    "/portal/appointments",
    "/portal/visits",
    "/portal/family",
    "/portal/profile",
  ];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });

    // The protected layout may finish its streamed redirect after the initial
    // document reaches DOMContentLoaded, so assert the final URL with polling.
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 10_000 });
  }
});

test("patient portal data APIs do not expose data to anonymous requests", async ({ request }) => {
  const routes = [
    "/api/patient/appointments",
    "/api/patient/portal/dashboard",
    "/api/patient/portal/profile",
    "/api/patient/portal/visits",
    "/api/patient/delegations",
  ];

  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), `${route} should reject anonymous access`).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
