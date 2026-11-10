import { expect, test } from "@playwright/test";

const patientId = "patient_demo_not_real";

test("patient contact-profile endpoint requires an authorized employee session", async ({ request }) => {
  const response = await request.get(`/api/clinic/patients/${patientId}/contact-profile`);
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient contact-profile mutation requires an authorized employee session", async ({ request }) => {
  const response = await request.post(`/api/clinic/patients/${patientId}/contact-profile`, {
    data: { action: "ADD_CONTACT", type: "PHONE", value: "01012345678" },
  });
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient consent history endpoint requires an authorized employee session", async ({ request }) => {
  const response = await request.get(`/api/clinic/patients/${patientId}/consents`);
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});


test("patient consent recording requires an authorized employee session", async ({ request }) => {
  const response = await request.post(`/api/clinic/patients/${patientId}/consents`, {
    data: {
      consentType: "PERSONAL_DATA_PROCESSING",
      decision: "GRANTED",
      captureMethod: "WRITTEN",
      documentVersion: "2026.01",
      signerPatientId: patientId,
    },
  });
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});
