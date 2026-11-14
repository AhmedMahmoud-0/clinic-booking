import { expect, test } from "@playwright/test";

test("anonymous visitors are redirected from Update 76 patient portal pages to sign-in", async ({ page }) => {
  // The Playwright project may provide a saved storageState. This test is
  // specifically about anonymous access, so remove any inherited auth state
  // before each protected-route request.
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test.setTimeout(240_000);

  for (const route of [
    "/portal/records",
    "/portal/visits/demo-visit-id",
    "/portal/billing",
    "/portal/complaints",
    "/portal/notifications",
  ]) {
    await page.context().clearCookies();
    await page.goto(route, { waitUntil: "commit", timeout: 60_000 });
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 45_000 });
  }
});

test("Update 76 patient APIs reject anonymous access without caching", async ({ request }) => {
  for (const route of [
    "/api/patient/portal/records",
    "/api/patient/portal/visits/demo-visit-id",
    "/api/patient/portal/billing",
    "/api/patient/portal/complaints",
    "/api/patient/portal/notifications",
  ]) {
    const response = await request.get(route);
    expect(response.status(), `${route} should reject anonymous access`).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("complaint submission is protected before processing an anonymous payload", async ({ request }) => {
  const response = await request.post("/api/patient/portal/complaints", {
    data: { category: "OTHER", subject: "Anonymous test", description: "This request must not be accepted without a patient session." },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("notification read action is also protected for anonymous requests", async ({ request }) => {
  const response = await request.post("/api/patient/portal/notifications/not-a-real-id/read");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
