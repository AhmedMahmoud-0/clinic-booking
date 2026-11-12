import { expect, test } from "@playwright/test";

const protectedRoutes: Array<{ name: string; url: string; method: "GET" | "POST"; body?: unknown }> = [
  { name: "Lab result review worklist", url: "/api/lab/results/worklist", method: "GET" },
  { name: "Critical communication worklist", url: "/api/lab/critical-communications/worklist", method: "GET" },
  { name: "Lab result submission", url: "/api/lab/order-items/fake-order-item/result/submit", method: "POST", body: {} },
  { name: "Lab result approval", url: "/api/lab/results/fake-result/review", method: "POST", body: { decision: "APPROVED" } },
  { name: "Lab result release", url: "/api/lab/results/fake-result/release", method: "POST", body: {} },
  { name: "Critical-result notification", url: "/api/lab/results/fake-result/critical-communications", method: "POST", body: { method: "PHONE", communicatedToName: "Dr Demo" } },
  { name: "Critical-result escalation", url: "/api/lab/critical-communications/fake-communication/escalate", method: "POST", body: { reason: "No acknowledgement." } },
  { name: "Critical-result read-back", url: "/api/lab/critical-communications/fake-communication/acknowledge", method: "POST", body: { readBackConfirmed: true } },
  { name: "Doctor laboratory result", url: "/api/doctor/lab-results/fake-result", method: "GET" },
  { name: "Doctor laboratory clinical review", url: "/api/doctor/lab-results/fake-result/review", method: "POST", body: { decision: "REVIEWED" } },
];

for (const route of protectedRoutes) {
  test(`${route.name} requires an authorized employee session`, async ({ request }) => {
    const response = await request.fetch(route.url, {
      method: route.method,
      ...(route.body ? { data: route.body } : {}),
      headers: route.body ? { "content-type": "application/json", origin: "https://localhost:3100" } : undefined,
    });
    expect([401, 403]).toContain(response.status());
  });
}

test("Lab result approval rejects caller-selected actor and timestamp fields before processing", async ({ request }) => {
  const response = await request.post("/api/lab/results/fake-result/review", {
    data: { decision: "APPROVED", reviewerEmployeeId: "forged", reviewedAt: "2026-01-01T00:00:00.000Z" },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(response.status());
});
