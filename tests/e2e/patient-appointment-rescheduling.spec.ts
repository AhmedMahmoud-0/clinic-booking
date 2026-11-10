import { expect, test } from "@playwright/test";

const endpoint = "/api/patient/appointments/appointment_demo_id/reschedule";
const validRequest = { startsAt: "2026-11-12T09:30:00.000Z" };

const forgedRequest = {
  ...validRequest,
  patientId: "another_patient",
  doctorId: "forged_doctor",
  serviceId: "forged_service",
  consultationRoomId: "forged_room",
  bookedPrice: "0.01",
  changedByPatientId: "forged_actor",
  status: "CONFIRMED",
};

test("patient appointment rescheduling requires a verified patient portal session", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: validRequest,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot choose patient, doctor, service, room, price, or actor", async ({ request }) => {
  const response = await request.post(endpoint, {
    headers: { "content-type": "application/json" },
    data: forgedRequest,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
