import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected from every patient portal page to sign-in", async ({ browser, baseURL }) => {
  test.setTimeout(120_000);

  // This route test must be anonymous even when the Playwright project has a
  // default storageState for authenticated workspace coverage. A fresh context
  // with an explicitly empty state prevents an employee/patient session from
  // being mistaken for an anonymous visitor.
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  const routes = [
    "/portal",
    "/portal/appointments",
    "/portal/visits",
    "/portal/visits/demo-visit-id",
    "/portal/records",
    "/portal/billing",
    "/portal/family",
    "/portal/complaints",
    "/portal/notifications",
    "/portal/profile",
  ];

  try {
    for (const route of routes) {
      await context.clearCookies();
      await page.goto(route, { waitUntil: "domcontentloaded" });

      // The protected layout may finish its streamed redirect after the initial
      // document reaches DOMContentLoaded, so assert the final URL with polling.
      await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 10_000 });
    }
  } finally {
    await context.close();
  }
});

test("patient portal data APIs do not expose data to anonymous requests", async ({ request }) => {
  const routes = [
    "/api/patient/appointments",
    "/api/patient/portal/dashboard",
    "/api/patient/portal/profile",
    "/api/patient/portal/visits",
    "/api/patient/portal/visits/demo-visit-id",
    "/api/patient/delegations",
  ];

  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), `${route} should reject anonymous access`).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
