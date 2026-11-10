import { expect, test } from "@playwright/test";

const endpoint = "/api/public/appointments/guest/reschedule";
const validShapeToken = "A".repeat(43);
const validStartsAt = "2026-11-12T09:30:00.000Z";

test("guest appointment rescheduling rejects a missing origin", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: { managementToken: validShapeToken, startsAt: validStartsAt },
  });

  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_ORIGIN");
});

test("guest appointment rescheduling requires a JSON request body", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post(endpoint, { headers: { origin } });

  expect(response.status()).toBe(415);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("JSON_REQUIRED");
});

test("guest appointment rescheduling validates token and timestamp without requiring an account", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post(endpoint, {
    headers: { origin, "content-type": "application/json" },
    data: { managementToken: validShapeToken },
  });

  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_GUEST_APPOINTMENT_RESCHEDULING_REQUEST");
});

test("an unknown guest token returns a generic no-store response without echoing it", async ({ page, request }) => {
  await page.goto("/");
  const origin = await page.evaluate(() => window.location.origin);
  const response = await request.post(endpoint, {
    headers: { origin, "content-type": "application/json" },
    data: { managementToken: validShapeToken, startsAt: validStartsAt },
  });

  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const responseText = await response.text();
  expect(responseText).not.toContain(validShapeToken);
  expect(responseText).not.toContain("appointmentId");
});
