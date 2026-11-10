import { expect, test } from "@playwright/test";

const cancellationEndpoint = "/api/reception/appointments/appointment_demo_id/cancel";
const reschedulingEndpoint = "/api/reception/appointments/appointment_demo_id/reschedule";

const validCancellation = { reasonCode: "PATIENT_REQUESTED" };
const validRescheduling = {
  reasonCode: "DOCTOR_UNAVAILABLE",
  startsAt: "2026-11-12T09:30:00.000Z",
};

test("Reception appointment cancellation requires an authorized employee session", async ({ request }) => {
  const response = await request.post(cancellationEndpoint, {
    headers: { "content-type": "application/json" },
    data: validCancellation,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot select a patient, status, actor, or free-form reason for cancellation", async ({ request }) => {
  const response = await request.post(cancellationEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validCancellation,
      patientId: "another_patient",
      status: "CANCELLED",
      changedByEmployeeId: "forged_employee",
      reason: "free-form override",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("Reception appointment rescheduling requires an authorized employee session", async ({ request }) => {
  const response = await request.post(reschedulingEndpoint, {
    headers: { "content-type": "application/json" },
    data: validRescheduling,
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});

test("unauthenticated callers cannot choose doctor, service, room, price, or actor when rescheduling", async ({ request }) => {
  const response = await request.post(reschedulingEndpoint, {
    headers: { "content-type": "application/json" },
    data: {
      ...validRescheduling,
      patientId: "another_patient",
      doctorId: "forged_doctor",
      serviceId: "forged_service",
      consultationRoomId: "forged_room",
      durationMinutes: 5,
      bookedPrice: "0.01",
      changedByEmployeeId: "forged_employee",
      status: "CONFIRMED",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
