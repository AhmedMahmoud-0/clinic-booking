import { expect, test } from "@playwright/test";

const endpoint = "/api/reception/appointments/appointment_demo_id/check-in";
const validBody = {
  identity: {
    firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
    secondIdentifier: { type: "DATE_OF_BIRTH", value: "1990-05-14" },
  },
};

test("Reception appointment check-in requires an authorized employee session", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: validBody,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot choose the Patient, actor, appointment status, or queue number", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validBody,
      patientId: "forged_patient",
      changedByEmployeeId: "forged_employee",
      status: "WAITING",
      queueNumber: 1,
      queueDate: "2026-11-09",
      doctorId: "forged_doctor",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
