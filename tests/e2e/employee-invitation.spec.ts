import { expect, test } from "@playwright/test";

const configuredAuthUrl = process.env.BETTER_AUTH_URL?.trim();
if (!configuredAuthUrl) {
  throw new Error("BETTER_AUTH_URL must be loaded before the employee invitation E2E tests run.");
}

const origin = new URL(configuredAuthUrl).origin;

test("employee invitation page rejects missing invitation credentials", async ({ page }) => {
  await page.goto("/auth/employee-invitation", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 2, name: "Invitation unavailable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept employee invitation" })).toHaveCount(0);
  await expect(page.getByLabel("Create password")).toHaveCount(0);
});

test("admin employee invitation endpoint requires the System Admin permission", async ({ request }) => {
  const response = await request.post("/api/admin/employee-invitations", {
    headers: { origin, "content-type": "application/json" },
    data: { employeeId: "employee_test", reason: "Approved staff onboarding" },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("employee invitation acceptance requires a signed-in identity", async ({ request }) => {
  const response = await request.post("/api/auth/employee-invitations/accept", {
    headers: { origin, "content-type": "application/json" },
    data: { employeeId: "employee_test", token: "x".repeat(40) },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
