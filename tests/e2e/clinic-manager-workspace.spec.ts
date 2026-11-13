import { expect, test } from "@playwright/test";

test("Clinic Manager workspace pages require an authorized employee session", async ({ page }) => {
  for (const route of ["/clinic-manager", "/clinic-manager/staff"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
});

test("Clinic Manager overview and staff APIs reject anonymous access without caching", async ({ request }) => {
  for (const route of ["/api/clinic-manager/overview", "/api/clinic-manager/staff"]) {
    const response = await request.get(route);
    expect(response.status(), `${route} should reject anonymous access`).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
