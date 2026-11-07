import { expect, test } from "@playwright/test";

// Playwright config loads .env before test discovery; use the same canonical
// origin as Better Auth instead of duplicating a fixed localhost port.
const configuredAuthUrl = process.env.BETTER_AUTH_URL;
if (!configuredAuthUrl) {
  throw new Error("BETTER_AUTH_URL must be available to the E2E test process.");
}

const appOrigin = new URL(configuredAuthUrl).origin;
const sameOriginHeaders = {
  Origin: appOrigin,
  "Content-Type": "application/json",
};

test("staff patient-delegation list requires an authorized employee session", async ({ request }) => {
  const response = await request.get(
    "/api/clinic/patient-delegations?subjectPatientId=patient-demo",
    { headers: { Origin: sameOriginHeaders.Origin } },
  );

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("staff patient-delegation creation requires an authorized employee session", async ({ request }) => {
  const response = await request.post("/api/clinic/patient-delegations", {
    headers: sameOriginHeaders,
    data: {
      subjectPatientId: "patient-subject-demo",
      granteePatientId: "patient-grantee-demo",
      scopes: ["VIEW_PROFILE"],
      expiresAt: "2027-01-01T12:00:00.000Z",
      reason: "Verified family relationship",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("adult grant approval requires a verified patient session", async ({ request }) => {
  const response = await request.post("/api/patient/delegations/grant-demo/decision", {
    headers: sameOriginHeaders,
    data: { decision: "APPROVE" },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient-side grant revocation requires a verified patient session", async ({ request }) => {
  const response = await request.post("/api/patient/delegations/grant-demo/revoke", {
    headers: sameOriginHeaders,
    data: { reason: "Patient requested revocation" },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("patient delegation list requires a verified patient session", async ({ request }) => {
  const response = await request.get("/api/patient/delegations");

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
