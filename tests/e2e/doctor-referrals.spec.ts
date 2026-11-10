import { expect, test } from "@playwright/test";

const referralsEndpoint = "/api/doctor/encounters/encounter_demo_1/referrals";
const validReferral = {
  type: "INTERNAL",
  referredToSpecialtyId: "specialty_demo_1",
  reason: "Requires specialist review",
};

test("Doctor Encounter referrals require an authorized employee session", async ({ request }) => {
  const response = await request.get(referralsEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("creating a Doctor referral requires an authorized employee session", async ({ request }) => {
  const response = await request.post(referralsEndpoint, {
    headers: { "content-type": "application/json" },
    data: validReferral,
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated referral creation rejects forged clinical identity and lifecycle fields", async ({ request }) => {
  const response = await request.post(referralsEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validReferral,
      encounterId: "encounter_forged",
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      createdByEmployeeId: "employee_forged",
      status: "COMPLETED",
      completedAt: "2026-01-01T00:00:00.000Z",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
