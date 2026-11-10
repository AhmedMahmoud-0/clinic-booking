import { expect, test } from "@playwright/test";

const patientId = "patient_demo_not_real";
const relationshipId = "relationship_demo_not_real";

test("patient family relationship list requires an authorized employee session", async ({ request }) => {
  const response = await request.get(`/api/clinic/patients/${patientId}/relationships`);
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient family relationship creation requires an authorized employee session", async ({ request }) => {
  const response = await request.post(`/api/clinic/patients/${patientId}/relationships`, {
    data: { relatedPatientId: "patient_related_demo_not_real", relationshipType: "PARENT" },
  });
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("legal-guardian verification requires an authorized employee session", async ({ request }) => {
  const response = await request.post(
    `/api/clinic/patients/${patientId}/relationships/${relationshipId}/guardian-verification`,
    { data: { evidenceType: "BIRTH_CERTIFICATE", evidenceAttachmentId: "attachment_demo_not_real" } },
  );
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("legal-guardian verification revocation requires an authorized employee session", async ({ request }) => {
  const response = await request.delete(
    `/api/clinic/patients/${patientId}/relationships/${relationshipId}/guardian-verification`,
  );
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});


test("patient family relationship correction requires an authorized employee session", async ({ request }) => {
  const response = await request.patch(`/api/clinic/patients/${patientId}/relationships/${relationshipId}`, {
    data: { relationshipType: "PARENT", reasonCode: "DATA_ENTRY_ERROR" },
  });
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient family relationship deactivation requires an authorized employee session", async ({ request }) => {
  const response = await request.post(`/api/clinic/patients/${patientId}/relationships/${relationshipId}/deactivate`, {
    data: { reasonCode: "DUPLICATE_RELATIONSHIP" },
  });
  expect([401, 403]).toContain(response.status());
  expect(response.headers()["cache-control"]).toContain("no-store");
});
