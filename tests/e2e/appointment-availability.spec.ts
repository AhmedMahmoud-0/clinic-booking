import { expect, test } from "@playwright/test";

test("public appointment availability rejects missing inputs without caching", async ({ request }) => {
  const response = await request.get("/api/public/appointment-availability");

  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_APPOINTMENT_AVAILABILITY_REQUEST");
});

test("public appointment availability rejects impossible clinic-local dates", async ({ request }) => {
  const response = await request.get(
    "/api/public/appointment-availability?doctorId=doctor_demo_id&serviceId=service_demo_id&date=2026-02-30",
  );

  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("public appointment availability does not expose non-bookable doctor records", async ({ request }) => {
  const response = await request.get(
    "/api/public/appointment-availability?doctorId=doctor_not_found_demo&serviceId=service_not_found_demo&date=2099-01-01",
  );

  expect(response.status()).toBe(404);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("BOOKABLE_DOCTOR_NOT_FOUND");
  expect(JSON.stringify(body)).not.toContain("employeeNumber");
});
