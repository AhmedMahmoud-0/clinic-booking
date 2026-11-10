import { expect, test } from "@playwright/test";

const catalogEndpoint = "/api/doctor/diagnosis-catalog";
const diagnosesEndpoint = "/api/doctor/encounters/encounter_demo_1/diagnoses";
const primaryEndpoint = "/api/doctor/encounters/encounter_demo_1/diagnoses/encounter_diagnosis_demo_1/primary";

test("Doctor diagnosis catalogue requires an authorized employee session", async ({ request }) => {
  const response = await request.get(catalogEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Doctor Encounter diagnoses cannot be read without an authorized session", async ({ request }) => {
  const response = await request.get(diagnosesEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated diagnosis creation is rejected before forged identity fields are processed", async ({ request }) => {
  const response = await request.post(diagnosesEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      diagnosisId: "diagnosis_demo_1",
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      recordedByEmployeeId: "employee_forged",
      displayName: "Uncatalogued diagnosis",
      isPrimary: true,
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("changing the primary Encounter diagnosis requires an authorized employee session", async ({ request }) => {
  const response = await request.post(primaryEndpoint, {
    headers: { "content-type": "application/json" },
    data: {},
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
