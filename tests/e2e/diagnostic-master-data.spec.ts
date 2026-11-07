import { expect, test } from "@playwright/test";

const configuredAuthUrl = process.env.BETTER_AUTH_URL;
if (!configuredAuthUrl) {
  throw new Error("BETTER_AUTH_URL must be available to the E2E test process.");
}

const origin = new URL(configuredAuthUrl).origin;

test("diagnostic master-data catalog requires the clinic master-data permission", async ({ request }) => {
  const response = await request.get("/api/clinic/diagnostic-master-data", {
    headers: { Origin: origin },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("diagnostic catalog creation requires an authorized employee session", async ({ request }) => {
  const response = await request.post("/api/clinic/diagnostic-master-data/lab-tests", {
    headers: { Origin: origin },
    data: {
      code: "E2E-UNAUTHORIZED",
      name: "Unauthorized E2E Test",
      specimenType: "Synthetic",
      defaultTurnaroundMinutes: 60,
      requiresFasting: false,
      price: "100.00",
      reason: "E2E authorization boundary test",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
