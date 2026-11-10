import { expect, test } from "@playwright/test";

test("Doctor worklist requires an authorized employee session", async ({ request }) => {
  const response = await request.get("/api/doctor/queue");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Doctor worklist still requires authentication when a doctorId query parameter is supplied", async ({ request }) => {
  const response = await request.get("/api/doctor/queue?doctorId=another_doctor");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
