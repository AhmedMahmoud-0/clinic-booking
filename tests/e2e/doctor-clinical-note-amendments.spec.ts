import { expect, test } from "@playwright/test";

const amendmentsEndpoint = "/api/doctor/encounters/encounter_demo_1/clinical-note/amendments";

test("reading Doctor clinical-note amendments requires an authorized employee session", async ({ request }) => {
  const response = await request.get(amendmentsEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("appending a Doctor clinical-note amendment requires an authorized employee session", async ({ request }) => {
  const response = await request.post(amendmentsEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      reason: "Corrected a transcription error.",
      changes: { assessment: "Corrected assessment." },
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot forge amendment snapshots, author, or timestamp", async ({ request }) => {
  const response = await request.post(amendmentsEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      reason: "Forged correction.",
      changes: { assessment: "Forged text." },
      previousContent: "forged previous content",
      correctedContent: "forged corrected content",
      createdByEmployeeId: "employee_forged",
      createdAt: "2026-11-10T00:00:00.000Z",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("Doctor clinical-note amendment endpoints remain protected when query parameters are supplied", async ({ request }) => {
  const response = await request.post(`${amendmentsEndpoint}?authorEmployeeId=employee_forged`, {
    headers: { "content-type": "application/json" },
    data: {
      reason: "Corrected a transcription error.",
      changes: { assessment: "Corrected assessment." },
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
