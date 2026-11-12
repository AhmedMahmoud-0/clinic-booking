import { expect, test } from "@playwright/test";

const protectedRoutes: Array<{ name: string; url: string; method: "GET" | "POST" | "PUT"; body?: unknown }> = [
  { name: "radiology execution worklist", url: "/api/radiology/execution/worklist", method: "GET" },
  { name: "radiology exam start", url: "/api/radiology/exams/fake-exam/start", method: "POST", body: {} },
  { name: "radiology exam completion", url: "/api/radiology/exams/fake-exam/complete", method: "POST", body: {} },
  { name: "radiology report draft creation", url: "/api/radiology/exams/fake-exam/report", method: "POST", body: { findings: "Synthetic finding", impression: "Synthetic impression" } },
  { name: "radiology report approval worklist", url: "/api/radiology/reports/worklist", method: "GET" },
  { name: "radiology report draft update", url: "/api/radiology/reports/fake-report", method: "PUT", body: { findings: "Synthetic finding", impression: "Synthetic impression" } },
  { name: "radiology report submission", url: "/api/radiology/reports/fake-report/submit", method: "POST", body: {} },
  { name: "radiology report review", url: "/api/radiology/reports/fake-report/review", method: "POST", body: { decision: "APPROVED" } },
  { name: "radiology report release", url: "/api/radiology/reports/fake-report/release", method: "POST", body: {} },
  { name: "radiology critical communication", url: "/api/radiology/reports/fake-report/critical-communications", method: "POST", body: { method: "PHONE", communicatedToName: "Dr Demo" } },
  { name: "radiology critical communication worklist", url: "/api/radiology/critical-communications/worklist", method: "GET" },
  { name: "radiology critical read-back acknowledgement", url: "/api/radiology/critical-communications/fake-communication/acknowledge", method: "POST", body: { readBackConfirmed: true } },
  { name: "radiology critical escalation", url: "/api/radiology/critical-communications/fake-communication/escalate", method: "POST", body: { reason: "No response from the first contact." } },
  { name: "Doctor radiology report delivery", url: "/api/doctor/radiology-reports/fake-report", method: "GET" },
  { name: "Doctor radiology clinical review", url: "/api/doctor/radiology-reports/fake-report/review", method: "POST", body: { decision: "REVIEWED" } },
  { name: "Doctor external radiology referral creation", url: "/api/doctor/encounters/fake-encounter/external-radiology-referrals", method: "POST", body: {} },
  { name: "Doctor external radiology referral list", url: "/api/doctor/encounters/fake-encounter/external-radiology-referrals", method: "GET" },
  { name: "external radiology result worklist", url: "/api/external-radiology/referrals/worklist", method: "GET" },
  { name: "external radiology result receipt", url: "/api/external-radiology/referrals/fake-referral/result", method: "POST", body: { findings: "Outside finding", impression: "Outside impression" } },
  { name: "Doctor external radiology report delivery", url: "/api/doctor/external-radiology-referrals/fake-referral", method: "GET" },
  { name: "Doctor external radiology clinical review", url: "/api/doctor/external-radiology-referrals/fake-referral/review", method: "POST", body: { decision: "REVIEWED" } },
];

for (const route of protectedRoutes) {
  test(`${route.name} requires an authorized employee session`, async ({ request }) => {
    const response = await request.fetch(route.url, {
      method: route.method,
      ...(route.body !== undefined ? { data: route.body } : {}),
      headers: route.body !== undefined ? { "content-type": "application/json", origin: "https://localhost:3100" } : undefined,
    });
    expect([401, 403]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
}

test("radiology exam start rejects a caller-selected status or actor", async ({ request }) => {
  const response = await request.post("/api/radiology/exams/fake-exam/start", {
    data: { status: "COMPLETED", startedByEmployeeId: "forged" },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(response.status());
});

test("radiology report draft rejects caller-selected author, status, and approval fields", async ({ request }) => {
  const response = await request.post("/api/radiology/exams/fake-exam/report", {
    data: {
      findings: "Synthetic finding", impression: "Synthetic impression",
      status: "RELEASED", authoredByEmployeeId: "forged", approvedByEmployeeId: "forged", releasedAt: "2026-11-01T10:00:00Z",
    },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(response.status());
});

test("external radiology result rejects caller-selected receiver and review state", async ({ request }) => {
  const response = await request.post("/api/external-radiology/referrals/fake-referral/result", {
    data: {
      findings: "Outside finding", impression: "Outside impression",
      status: "REVIEWED", resultReceivedByEmployeeId: "forged", reviewedByEmployeeId: "forged", reviewedAt: "2026-11-01T10:00:00Z",
    },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(response.status());
});
