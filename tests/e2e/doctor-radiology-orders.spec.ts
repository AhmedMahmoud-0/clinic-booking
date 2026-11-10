import { expect, test } from "@playwright/test";

const catalogEndpoint = "/api/doctor/radiology-catalog";
const ordersEndpoint = "/api/doctor/encounters/encounter_demo_1/radiology-orders";
const validXrayOrder = {
  procedureIds: ["radiology_procedure_demo_xray"],
  priority: "ROUTINE",
  xrayPregnancyAssessment: { assessment: "SCREENING_REQUIRED" },
};

test("Doctor radiology catalogue requires an authorized employee session", async ({ request }) => {
  const response = await request.get(catalogEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Doctor Encounter radiology orders require an authorized employee session", async ({ request }) => {
  const response = await request.get(ordersEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("creating a Doctor radiology order requires an authorized employee session", async ({ request }) => {
  const response = await request.post(ordersEndpoint, {
    headers: { "content-type": "application/json" },
    data: validXrayOrder,
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated radiology-order creation rejects forged identity, procedure, resource, price, and state fields", async ({ request }) => {
  const response = await request.post(ordersEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validXrayOrder,
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      orderedByEmployeeId: "employee_forged",
      orderReference: "RAD-FORGED",
      status: "COMPLETED",
      resourceId: "resource_forged",
      procedureName: "Forged procedure",
      priceSnapshot: "0.01",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
