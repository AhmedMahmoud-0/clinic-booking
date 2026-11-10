import { expect, test } from "@playwright/test";

const endpoint = "/api/doctor/encounters/encounter_demo_1/clinical-note";

test("saving a Doctor clinical-note draft requires an authorized employee session", async ({ request }) => {
  const response = await request.put(endpoint, {
    headers: { "content-type": "application/json" },
    data: { chiefComplaint: "Synthetic demo complaint" },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated requests with forged clinical and identity fields remain blocked", async ({ request }) => {
  const response = await request.put(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      chiefComplaint: "Synthetic complaint",
      historyOfPresentIllness: "Synthetic history",
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      authorEmployeeId: "employee_forged",
      status: "SIGNED",
      signedAt: "2026-11-09T12:00:00.000Z",
      diagnosisId: "diagnosis_forged",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated clinical-note requests are rejected before payload validation", async ({ request }) => {
  const response = await request.put(endpoint, { data: "not-json" });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
