import { describe, expect, it } from "vitest";
import { guestAppointmentCancellationRequestSchema } from "../../src/server/appointments/guest-appointment-cancellation-validation";

const validToken = "A".repeat(43);

describe("guest appointment cancellation validation", () => {
  it("accepts a 32-byte base64url management token", () => {
    expect(guestAppointmentCancellationRequestSchema.safeParse({ managementToken: validToken }).success).toBe(true);
  });

  it("requires the management token", () => {
    expect(guestAppointmentCancellationRequestSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a token shorter than the generated token format", () => {
    expect(guestAppointmentCancellationRequestSchema.safeParse({ managementToken: "short" }).success).toBe(false);
  });

  it("rejects a token longer than the generated token format", () => {
    expect(guestAppointmentCancellationRequestSchema.safeParse({ managementToken: `${validToken}A` }).success).toBe(false);
  });

  it("rejects non-base64url characters", () => {
    expect(guestAppointmentCancellationRequestSchema.safeParse({ managementToken: `${"A".repeat(42)}+` }).success).toBe(false);
  });

  it("does not trim or normalize the bearer token", () => {
    expect(guestAppointmentCancellationRequestSchema.safeParse({ managementToken: ` ${validToken}` }).success).toBe(false);
  });

  it("rejects appointment identifiers and every other client-supplied field", () => {
    expect(guestAppointmentCancellationRequestSchema.safeParse({
      managementToken: validToken,
      appointmentId: "forged_appointment",
      patientId: "forged_patient",
      status: "CANCELLED",
      reason: "GUEST_REQUESTED_CANCELLATION",
    }).success).toBe(false);
  });
});
