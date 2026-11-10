import { expect, test } from "@playwright/test";

const endpoint = "/api/public/appointments/guest/cancel";
const validShapeToken = "A".repeat(43);

test("guest appointment cancellation rejects a missing origin", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: { managementToken: validShapeToken },
  });

  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_ORIGIN");
});

test("guest appointment cancellation requires a JSON request body", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post(endpoint, { headers: { origin } });

  expect(response.status()).toBe(415);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("JSON_REQUIRED");
});

test("guest appointment cancellation validates the token without requiring an account", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post(endpoint, {
    headers: { origin, "content-type": "application/json" },
    data: {},
  });

  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_GUEST_APPOINTMENT_CANCELLATION_REQUEST");
});

test("guest appointment cancellation refuses client-selected appointment or patient identities", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post(endpoint, {
    headers: { origin, "content-type": "application/json" },
    data: {
      managementToken: validShapeToken,
      appointmentId: "forged_appointment",
      patientId: "forged_patient",
    },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_GUEST_APPOINTMENT_CANCELLATION_REQUEST");
});

test("an unknown guest management token returns a generic no-store response without echoing the token", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post(endpoint, {
    headers: { origin, "content-type": "application/json" },
    data: { managementToken: validShapeToken },
  });

  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const text = await response.text();
  expect(text).not.toContain(validShapeToken);
  expect(text).not.toContain("appointmentId");
});
