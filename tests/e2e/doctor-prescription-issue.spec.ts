import { expect, test } from "@playwright/test";

const issueEndpoint = "/api/doctor/encounters/encounter_demo_1/prescriptions/prescription_demo_1/issue";

test("issuing a Doctor prescription requires an authorized employee session", async ({ request }) => {
  const response = await request.post(issueEndpoint, {
    headers: { "content-type": "application/json" },
    data: {},
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated prescription issuance cannot set issuer, status, or issue time", async ({ request }) => {
  const response = await request.post(issueEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      actorEmployeeId: "employee_forged",
      prescribedByEmployeeId: "employee_forged",
      status: "ISSUED",
      issuedAt: "2026-11-10T00:00:00.000Z",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated callers cannot issue a prescription through a forged Encounter and prescription path", async ({ request }) => {
  const response = await request.post(
    "/api/doctor/encounters/another_encounter/prescriptions/another_prescription/issue",
    {
      headers: { "content-type": "application/json" },
      data: {},
    },
  );
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("prescription issue route is protected when query parameters are supplied", async ({ request }) => {
  const response = await request.post(`${issueEndpoint}?status=ISSUED`, {
    headers: { "content-type": "application/json" },
    data: {},
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
