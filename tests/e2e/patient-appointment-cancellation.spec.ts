import { expect, test } from "@playwright/test";

const endpoint = "/api/patient/appointments/appointment_demo_id/cancel";

const forgedRequest = {
  patientId: "another_patient",
  changedByPatientId: "forged_actor",
  reason: "CLINICIAN_APPROVED",
  status: "CANCELLED",
  allowPatientOverlap: true,
};

test("patient appointment cancellation requires a verified patient portal session", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {},
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot choose the patient actor or cancellation reason", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: forgedRequest,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
