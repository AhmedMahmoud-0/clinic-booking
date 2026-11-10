import { expect, test } from "@playwright/test";

test("patient appointment creation requires a verified patient portal session", async ({ request }) => {
  const response = await request.post("/api/patient/appointments", {
    data: {
      patientId: "patient_demo_id",
      doctorId: "doctor_demo_id",
      serviceId: "service_demo_id",
      startsAt: "2099-01-01T08:30:00.000Z",
    },
  });

  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});
