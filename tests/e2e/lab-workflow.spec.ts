import { expect, test } from "@playwright/test";

const worklistEndpoint = "/api/lab/worklist";
const collectEndpoint = "/api/lab/order-items/lab_order_item_demo_1/collect";
const sampleEndpoint = "/api/lab/samples/lab_sample_demo_1";
const processEndpoint = "/api/lab/order-items/lab_order_item_demo_1/process";
const resultEndpoint = "/api/lab/order-items/lab_order_item_demo_1/result";

const validCollection = {
  identityVerification: {
    firstIdentifier: { type: "FULL_NAME", value: "Synthetic Patient" },
    secondIdentifier: { type: "MRN", value: "MRN-DEMO-000001" },
  },
};

test("Lab worklist requires an authorized Lab Staff employee session", async ({ request }) => {
  const response = await request.get(worklistEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("collecting a laboratory sample requires an authorized employee session", async ({ request }) => {
  const response = await request.post(collectEndpoint, {
    headers: { "content-type": "application/json" },
    data: validCollection,
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated sample collection cannot forge patient, encounter, actor, or specimen data", async ({ request }) => {
  const response = await request.post(collectEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validCollection,
      patientId: "patient_forged",
      encounterId: "encounter_forged",
      collectedByEmployeeId: "employee_forged",
      sampleNumber: "SMP-FORGED",
      status: "RECEIVED",
      specimenTypeSnapshot: "Forged",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("receiving a laboratory sample requires an authorized Lab Staff session", async ({ request }) => {
  const response = await request.post(sampleEndpoint, {
    headers: { "content-type": "application/json" },
    data: { action: "RECEIVE" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("rejecting a laboratory sample requires an authorized Lab Staff session", async ({ request }) => {
  const response = await request.post(sampleEndpoint, {
    headers: { "content-type": "application/json" },
    data: { action: "REJECT", reason: "Insufficient volume" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("starting laboratory processing requires an authorized Lab Staff session", async ({ request }) => {
  const response = await request.post(processEndpoint, {
    headers: { "content-type": "application/json" },
    data: {},
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("saving laboratory result drafts requires an authorized Lab Staff session", async ({ request }) => {
  const response = await request.put(resultEndpoint, {
    headers: { "content-type": "application/json" },
    data: { resultSummary: "Demo result" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("unauthenticated callers cannot forge result status, author, approval, or release fields", async ({ request }) => {
  const response = await request.put(resultEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      resultSummary: "Demo result",
      status: "RELEASED",
      authoredByEmployeeId: "employee_forged",
      approvedByEmployeeId: "employee_forged",
      releasedAt: "2026-11-10T12:00:00.000Z",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
