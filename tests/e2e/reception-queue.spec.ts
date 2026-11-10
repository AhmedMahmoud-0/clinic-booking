import { expect, test } from "@playwright/test";

const queueEndpoint = "/api/reception/queue?doctorId=doctor_demo_id";
const callNextEndpoint = "/api/reception/queue/call-next";

test("Reception doctor queue requires an authorized employee session", async ({ request }) => {
  const response = await request.get(queueEndpoint);
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Reception queue still requires authentication when the doctor filter is missing", async ({ request }) => {
  const response = await request.get("/api/reception/queue");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("calling the next queue ticket requires an authorized employee session", async ({ request }) => {
  const response = await request.post(callNextEndpoint, {
    headers: { "content-type": "application/json" },
    data: { doctorId: "doctor_demo_id" },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot choose a patient, queue entry, status, queue number, or actor", async ({ request }) => {
  const response = await request.post(callNextEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      doctorId: "doctor_demo_id",
      patientId: "forged_patient",
      queueEntryId: "forged_queue",
      status: "CALLED",
      queueNumber: 1,
      calledByEmployeeId: "forged_employee",
    },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
