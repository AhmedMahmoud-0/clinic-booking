import { expect, test } from "@playwright/test";

const configuredAuthUrl = process.env.BETTER_AUTH_URL;
if (!configuredAuthUrl) {
  throw new Error("BETTER_AUTH_URL must be available to the E2E test process.");
}

const origin = new URL(configuredAuthUrl).origin;

test("staff master-data endpoint requires the clinic master-data permission", async ({ request }) => {
  const response = await request.get("/api/clinic/master-data", {
    headers: { Origin: origin },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("public clinic catalog returns a minimal no-store response", async ({ request }) => {
  const response = await request.get("/api/public/clinic-catalog");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(Array.isArray(body.data.specialties)).toBe(true);
  expect(Array.isArray(body.data.doctors)).toBe(true);

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain("workEmail");
  expect(serialized).not.toContain("employeeNumber");
  expect(serialized).not.toContain("phone");
});
