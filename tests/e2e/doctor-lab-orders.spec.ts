import { expect, test } from "@playwright/test";

const catalogEndpoint = "/api/doctor/lab-catalog";
const ordersEndpoint = "/api/doctor/encounters/encounter_demo_1/lab-orders";
const validOrder = {
  labTestIds: ["lab_test_demo_1"],
  priority: "ROUTINE",
};

test("Doctor laboratory catalog requires an authorized employee session", async ({ request }) => {
  const response = await request.get(catalogEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Doctor Encounter laboratory orders require an authorized employee session", async ({ request }) => {
  const response = await request.get(ordersEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("creating a Doctor laboratory order requires an authorized employee session", async ({ request }) => {
  const response = await request.post(ordersEndpoint, {
    headers: { "content-type": "application/json" },
    data: validOrder,
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated lab-order creation rejects forged identity, catalog, pricing, and status fields", async ({ request }) => {
  const response = await request.post(ordersEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validOrder,
      patientId: "patient_forged",
      doctorId: "doctor_forged",
      orderedByEmployeeId: "employee_forged",
      orderReference: "LAB-FORGED",
      status: "COMPLETED",
      items: [{ labTestId: "lab_test_forged", priceSnapshot: "0.01", name: "Forged test" }],
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
