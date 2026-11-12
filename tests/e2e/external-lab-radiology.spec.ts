import { expect, test } from "@playwright/test";

const protectedRoutes: Array<{ name: string; url: string; method: "GET" | "POST"; body?: unknown }> = [
  { name: "external laboratory intake", url: "/api/external-lab/intakes", method: "POST", body: {} },
  { name: "Doctor external laboratory referral", url: "/api/doctor/encounters/fake-encounter/external-lab-referrals", method: "POST", body: {} },
  { name: "Doctor external laboratory referral list", url: "/api/doctor/encounters/fake-encounter/external-lab-referrals", method: "GET" },
  { name: "external laboratory referral worklist", url: "/api/external-lab/referrals/worklist", method: "GET" },
  { name: "external laboratory result receipt", url: "/api/external-lab/referrals/fake-referral/result", method: "POST", body: {} },
  { name: "external laboratory Doctor review", url: "/api/external-lab/referrals/fake-referral/review", method: "POST", body: {} },
  { name: "external laboratory referral cancellation", url: "/api/external-lab/referrals/fake-referral/cancel", method: "POST", body: {} },
  { name: "diagnostic-only patient conversion", url: "/api/clinic/patients/fake-patient/record-type/convert", method: "POST", body: {} },
  { name: "external provider critical-result read-back", url: "/api/lab/critical-communications/fake-communication/acknowledge-external", method: "POST", body: { readBackConfirmed: true, resolutionNotes: "Read-back confirmed with the external provider." } },
  { name: "radiology resource worklist", url: "/api/radiology/worklist", method: "GET" },
  { name: "radiology scheduling", url: "/api/radiology/order-items/fake-order-item/schedule", method: "POST", body: {} },
  { name: "radiology identity verification", url: "/api/radiology/exams/fake-exam/identity-verification", method: "POST", body: {} },
  { name: "radiology preparation", url: "/api/radiology/exams/fake-exam/preparation", method: "POST", body: {} },
  { name: "radiology pregnancy screening", url: "/api/radiology/exams/fake-exam/pregnancy-screening", method: "POST", body: {} },
  { name: "radiology readiness", url: "/api/radiology/exams/fake-exam/readiness", method: "GET" },
  { name: "Radiologist pregnancy screening review", url: "/api/radiology/exams/fake-exam/pregnancy-screening/review", method: "POST", body: {} },
  { name: "Radiologist pregnancy review worklist", url: "/api/radiology/pregnancy-review/worklist", method: "GET" },
];

for (const route of protectedRoutes) {
  test(`${route.name} requires an authorized employee session`, async ({ request }) => {
    const response = await request.fetch(route.url, {
      method: route.method,
      ...(route.body ? { data: route.body } : {}),
      headers: route.body ? { "content-type": "application/json", origin: "https://localhost:3100" } : undefined,
    });
    expect([401, 403]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
}

test("external intake rejects caller-selected identity, creator, and Encounter linkage", async ({ request }) => {
  const response = await request.post("/api/external-lab/intakes", {
    data: { patientMode: "NEW", patient: { firstName: "Demo", lastName: "Patient" }, requestSource: "PAPER", referringProviderName: "Dr Demo", referringFacilityName: "Outside Clinic", labTestIds: ["test-1"], patientId: "forged", createdByEmployeeId: "forged", encounterId: "forged" },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(response.status());
});

test("radiology schedule rejects caller-selected status, actor, and end time", async ({ request }) => {
  const response = await request.post("/api/radiology/order-items/fake-order-item/schedule", {
    data: { resourceId: "resource-1", scheduledStartsAt: "2026-12-01T09:00:00+02:00", scheduledEndsAt: "2026-12-01T10:00:00+02:00", status: "COMPLETED", scheduledByEmployeeId: "forged" },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(response.status());
});

test("Radiologist pregnancy review rejects caller-selected reviewer and review timestamp", async ({ request }) => {
  const response = await request.post("/api/radiology/exams/fake-exam/pregnancy-screening/review", {
    data: { decision: "AUTHORIZE_AFTER_REVIEW", notes: "Reviewed with clinical context.", reviewedByEmployeeId: "forged", reviewedAt: "2026-12-01T09:00:00Z" },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(response.status());
});
