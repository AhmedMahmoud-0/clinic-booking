import { expect, test } from "@playwright/test";

const prescriptionsEndpoint = "/api/doctor/encounters/encounter_demo_1/prescriptions";
const updateEndpoint = "/api/doctor/encounters/encounter_demo_1/prescriptions/prescription_demo_1";
const validDraft = {
  generalInstructions: "Take with food",
  items: [{
    medicationName: "Demo medication",
    dosage: "1 tablet",
    frequency: "Daily",
    durationDays: 5,
    quantity: "5",
    quantityUnit: "tablets",
    isPrn: false,
    refills: 0,
  }],
};

test("Doctor Encounter prescriptions require an authorized employee session", async ({ request }) => {
  const response = await request.get(prescriptionsEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("creating a Doctor prescription draft requires an authorized employee session", async ({ request }) => {
  const response = await request.post(prescriptionsEndpoint, {
    headers: { "content-type": "application/json" },
    data: validDraft,
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated prescription creation rejects forged identity and issuance fields before processing", async ({ request }) => {
  const response = await request.post(prescriptionsEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validDraft,
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      prescribedByEmployeeId: "employee_forged",
      status: "ISSUED",
      issuedAt: new Date().toISOString(),
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("updating a Doctor prescription draft requires an authorized employee session", async ({ request }) => {
  const response = await request.put(updateEndpoint, {
    headers: { "content-type": "application/json" },
    data: validDraft,
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated prescription updates reject caller-selected author, status, and item identifiers", async ({ request }) => {
  const response = await request.put(updateEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validDraft,
      prescribedByEmployeeId: "employee_forged",
      status: "ISSUED",
      items: [{ ...validDraft.items[0], id: "item_forged" }],
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
