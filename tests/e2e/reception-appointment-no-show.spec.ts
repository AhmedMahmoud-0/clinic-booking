import { expect, test } from "@playwright/test";

const endpoint = "/api/reception/appointments/appointment_demo_id/no-show";

test("Reception appointment no-show requires an authorized employee session", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {},
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot mark an appointment no-show or choose its actor", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      status: "NO_SHOW",
      appointmentId: "another_appointment",
      patientId: "another_patient",
      actorEmployeeId: "forged_employee",
      reason: "free-form reason",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Reception no-show endpoint requires a JSON request body", async ({ request }) => {
  const response = await request.post(endpoint, { data: "{}" });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("no-show endpoint does not accept unauthenticated empty or forged transition requests", async ({ request }) => {
  for (const data of [{}, { status: "NO_SHOW" }, { reasonCode: "PATIENT_DID_NOT_ARRIVE" }]) {
    const response = await request.post(endpoint, {
      headers: { "content-type": "application/json" },
      data,
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});
