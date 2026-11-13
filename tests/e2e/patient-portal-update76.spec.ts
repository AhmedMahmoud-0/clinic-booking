import { expect, test } from "@playwright/test";

test("Update 76 patient portal pages require a verified patient session", async ({ page }) => {
  // The first visit to a newly added App Router page can trigger a cold
  // development compilation. Wait for the navigation commit and assert the
  // server redirect, rather than waiting for every document/load event.
  test.setTimeout(90_000);

  for (const route of [
    "/portal/records",
    "/portal/billing",
    "/portal/complaints",
    "/portal/notifications",
  ]) {
    await page.goto(route, { waitUntil: "commit", timeout: 60_000 });
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 10_000 });
  }
});

test("Update 76 patient APIs reject anonymous access without caching", async ({ request }) => {
  for (const route of [
    "/api/patient/portal/records",
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
