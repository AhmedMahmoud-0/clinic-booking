import { expect, test } from "@playwright/test";

const endpoint = "/api/doctor/queue/queue_demo_id/start";

test("starting a Doctor encounter requires an authorized employee session", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {},
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated requests with forged visit fields remain blocked before payload processing", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: {
      patientId: "another_patient",
      appointmentId: "another_appointment",
      doctorId: "another_doctor",
      encounterId: "forged_encounter",
      status: "IN_SERVICE",
      actorEmployeeId: "forged_employee",
      startedAt: "2026-11-09T12:00:00.000Z",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated requests are rejected before request-body validation", async ({ request }) => {
  const response = await request.post(endpoint, { data: "{}" });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
