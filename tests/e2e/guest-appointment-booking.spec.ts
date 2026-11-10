import { expect, test } from "@playwright/test";

test("public guest appointment creation rejects a missing origin", async ({ request }) => {
  const response = await request.post("/api/public/appointments/guest", {
    headers: { "content-type": "application/json" },
    data: {},
  });

  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_ORIGIN");
});

test("public guest appointment creation validates the request without requiring an account", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post("/api/public/appointments/guest", {
    headers: { origin, "content-type": "application/json" },
    data: {},
  });

  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_GUEST_APPOINTMENT_REQUEST");
});

test("public guest booking refuses any client-supplied Patient identity or booking authority", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post("/api/public/appointments/guest", {
    headers: { origin, "content-type": "application/json" },
    data: {
      fullName: "Guest Demo",
      phone: "01012345678",
      doctorId: "doctor_demo_id",
      serviceId: "service_demo_id",
      startsAt: "2099-01-01T08:30:00.000Z",
      patientId: "must-not-be-linked-by-public-input",
    },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_GUEST_APPOINTMENT_REQUEST");
});
