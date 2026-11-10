import { expect, test } from "@playwright/test";

const inboxEndpoint = "/api/doctor/referrals/inbox";
const lifecycleEndpoint = "/api/doctor/referrals/referral_demo_1";

test("Doctor referral inbox requires an authorized employee session", async ({ request }) => {
  const response = await request.get(inboxEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Doctor referral lifecycle action requires an authorized employee session", async ({ request }) => {
  const response = await request.post(lifecycleEndpoint, {
    headers: { "content-type": "application/json" },
    data: { action: "ACCEPT" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated callers cannot choose a referral status or lifecycle actor", async ({ request }) => {
  const response = await request.post(lifecycleEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      action: "ACCEPT",
      status: "COMPLETED",
      actorEmployeeId: "employee_forged",
      doctorId: "doctor_forged",
      completedAt: "2026-01-01T00:00:00.000Z",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated caller cannot access the inbox by supplying a forged Doctor filter", async ({ request }) => {
  const response = await request.get(`${inboxEndpoint}?doctorId=doctor_forged`);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
