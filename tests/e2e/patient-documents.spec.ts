import { expect, test } from "@playwright/test";

const patientId = "patient_demo_not_real";
const documentId = "attachment_demo_not_real";

test("patient document metadata endpoint requires an authorized employee session", async ({ request }) => {
  const response = await request.get(`/api/clinic/patients/${patientId}/documents`);
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient document upload endpoint requires an authorized employee session", async ({ request }) => {
  const response = await request.post(`/api/clinic/patients/${patientId}/documents`, {
    multipart: { file: { name: "sample.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") } },
  });
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient document download endpoint requires an authorized employee session", async ({ request }) => {
  const response = await request.get(`/api/clinic/patients/${patientId}/documents/${documentId}`);
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});
