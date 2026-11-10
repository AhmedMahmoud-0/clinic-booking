import { expect, test } from "@playwright/test";

const endpoint = "/api/reception/appointments/appointment_demo_id/resolve-guest";
const requestBody = {
  patientId: "patient_demo_id",
  identity: {
    firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
    secondIdentifier: { type: "DATE_OF_BIRTH", value: "1995-04-12" },
  },
};

test("guest appointment resolution requires an authorized Reception employee", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: requestBody,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("guest appointment resolution rejects unauthenticated identity and overlap override claims", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...requestBody,
      patientOverlapReasonCode: "CLINICIAN_REQUESTED_FOLLOW_UP",
      authorizedByEmployeeId: "employee_admin",
      allowPatientOverlap: true,
      guestPhone: "01012345678",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
