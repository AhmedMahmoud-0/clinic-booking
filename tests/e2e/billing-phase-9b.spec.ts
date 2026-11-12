import { expect, test } from "@playwright/test";

const protectedRoutes: Array<{ name: string; url: string; method: "GET" | "POST"; body?: unknown }> = [
  { name: "external diagnostic billing candidates", url: "/api/cashier/invoices/eligible-external-intakes", method: "GET" },
  { name: "discount request", url: "/api/cashier/invoices/fake-invoice/discount-requests", method: "POST", body: { amount: "10.00", reason: "Synthetic discount request" } },
  { name: "refund request", url: "/api/cashier/invoices/fake-invoice/refund-requests", method: "POST", body: { reason: "Synthetic unprovided item", items: [{ invoiceItemId: "fake-item" }] } },
  { name: "approved refund execution worklist", url: "/api/cashier/refunds/worklist", method: "GET" },
  { name: "refund completion", url: "/api/cashier/refunds/fake-refund/complete", method: "POST", body: {} },
  { name: "discount approval worklist", url: "/api/clinic-manager/billing/discount-approvals", method: "GET" },
  { name: "discount decision", url: "/api/clinic-manager/billing/discount-approvals/fake-approval/decision", method: "POST", body: { decision: "APPROVE" } },
  { name: "refund approval worklist", url: "/api/clinic-manager/billing/refund-approvals", method: "GET" },
  { name: "refund decision", url: "/api/clinic-manager/billing/refund-approvals/fake-refund/decision", method: "POST", body: { decision: "APPROVE" } },
  { name: "financial billing report", url: "/api/billing/reports/financial?from=2026-11-01&to=2026-11-11", method: "GET" },
];

for (const route of protectedRoutes) {
  test(`${route.name} requires the proper employee permission`, async ({ request }) => {
    const response = await request.fetch(route.url, {
      method: route.method,
      ...(route.body !== undefined ? { data: route.body } : {}),
      headers: route.body !== undefined ? { "content-type": "application/json", origin: "https://localhost:3100" } : undefined,
    });
    expect([401, 403]).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
  });
}

test("discount and refund decision routes reject caller-selected decision actors", async ({ request }) => {
  const discount = await request.post("/api/clinic-manager/billing/discount-approvals/fake-approval/decision", {
    data: { decision: "APPROVE", decidedByEmployeeId: "forged" },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  const refund = await request.post("/api/clinic-manager/billing/refund-approvals/fake-refund/decision", {
    data: { decision: "APPROVE", approvedByEmployeeId: "forged", completedByEmployeeId: "forged" },
    headers: { "content-type": "application/json", origin: "https://localhost:3100" },
  });
  expect([400, 401, 403]).toContain(discount.status());
  expect([400, 401, 403]).toContain(refund.status());
});
