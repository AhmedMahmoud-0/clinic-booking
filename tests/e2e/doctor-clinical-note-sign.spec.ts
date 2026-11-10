import { expect, test } from "@playwright/test";

const signEndpoint = "/api/doctor/encounters/encounter_demo_1/clinical-note/sign";

test("signing a Doctor clinical note requires an authorized employee session", async ({ request }) => {
  const response = await request.post(signEndpoint, {
    headers: { "content-type": "application/json" },
    data: {},
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot select note status, signer, or signature time", async ({ request }) => {
  const response = await request.post(signEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      status: "SIGNED",
      signedByEmployeeId: "employee_forged",
      authorEmployeeId: "employee_forged",
      signedAt: "2026-11-10T00:00:00.000Z",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated callers cannot sign a note through a forged Encounter path", async ({ request }) => {
  const response = await request.post("/api/doctor/encounters/another_encounter/clinical-note/sign", {
    headers: { "content-type": "application/json" },
    data: {},
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("clinical-note signing route remains protected when query parameters are supplied", async ({ request }) => {
  const response = await request.post(`${signEndpoint}?status=SIGNED`, {
    headers: { "content-type": "application/json" },
    data: {},
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
