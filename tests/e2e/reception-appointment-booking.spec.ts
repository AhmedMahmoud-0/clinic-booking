import { expect, test } from "@playwright/test";

test("reception appointment creation requires an authorized employee session", async ({ request }) => {
  const response = await request.post("/api/reception/appointments", {
    headers: { "content-type": "application/json" },
    data: {
      patientId: "patient_demo_id",
      doctorId: "doctor_demo_id",
      serviceId: "service_demo_id",
      startsAt: "2099-01-05T08:30:00.000Z",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("reception appointment creation remains protected even when an unauthenticated caller submits override-looking fields", async ({ request }) => {
  const response = await request.post("/api/reception/appointments", {
    headers: { "content-type": "application/json" },
    data: {
      patientId: "patient_demo_id",
      doctorId: "doctor_demo_id",
      serviceId: "service_demo_id",
      startsAt: "2099-01-05T08:30:00.000Z",
      patientOverlapReasonCode: "CLINICIAN_REQUESTED_FOLLOW_UP",
      authorizedByEmployeeId: "employee_admin",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
