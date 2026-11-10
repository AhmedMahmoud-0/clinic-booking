import { expect, test } from "@playwright/test";

const endpoint = "/api/reception/walk-ins";
const validBody = {
  patientId: "patient_demo_id",
  doctorId: "doctor_demo_id",
  identity: {
    firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
    secondIdentifier: { type: "DATE_OF_BIRTH", value: "1990-05-14" },
  },
};

test("Reception walk-in registration requires an authorized employee session", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: validBody,
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot select queue metadata, appointment linkage, or actor", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validBody,
      queueNumber: 1,
      queueDate: "2026-11-09",
      type: "APPOINTMENT",
      status: "CALLED",
      appointmentId: "forged_appointment",
      createdByEmployeeId: "forged_employee",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot provide a patient record instead of an existing patient ID", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      doctorId: validBody.doctorId,
      patient: { firstName: "Forged", lastName: "Patient", mrn: "MRN-FORGED" },
      identity: validBody.identity,
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("walk-in registration does not accept caller-selected identity verification status", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validBody,
      identityVerified: true,
      verificationResult: "VERIFIED",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});
