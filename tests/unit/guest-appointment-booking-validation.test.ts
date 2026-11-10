import { describe, expect, it } from "vitest";
import { createGuestAppointmentSchema } from "../../src/server/appointments/guest-appointment-booking-validation";

const validInput = {
  fullName: "  أحمد محمود علي  ",
  phone: "01012345678",
  doctorId: "doctor_demo_id",
  serviceId: "service_demo_id",
  startsAt: "2026-11-12T08:30:00.000Z",
};

describe("public guest appointment validation", () => {
  it("accepts a guest booking without email", () => {
    expect(createGuestAppointmentSchema.safeParse(validInput).success).toBe(true);
  });

  it("accepts an optional valid email and normalizes its case", () => {
    const result = createGuestAppointmentSchema.safeParse({ ...validInput, email: "  TEST@Example.com " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("test@example.com");
  });

  it("allows Arabic-Indic phone digits without treating them as patient identity", () => {
    expect(createGuestAppointmentSchema.safeParse({ ...validInput, phone: "٠١٠١٢٣٤٥٦٧٨" }).success).toBe(true);
  });

  it("rejects a missing or too-short full name", () => {
    expect(createGuestAppointmentSchema.safeParse({ ...validInput, fullName: " " }).success).toBe(false);
    expect(createGuestAppointmentSchema.safeParse({ ...validInput, fullName: "A" }).success).toBe(false);
  });

  it("rejects control characters in the full name", () => {
    expect(createGuestAppointmentSchema.safeParse({ ...validInput, fullName: "Ahmed\nAli" }).success).toBe(false);
  });

  it("rejects a phone value outside the 7-to-15 digit range", () => {
    for (const phone of ["12345", "12345678901234567890", "abcdefghijk"]) {
      expect(createGuestAppointmentSchema.safeParse({ ...validInput, phone }).success).toBe(false);
    }
  });

  it("rejects an invalid optional email", () => {
    expect(createGuestAppointmentSchema.safeParse({ ...validInput, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects local timestamps and arbitrary offsets", () => {
    for (const startsAt of ["2026-11-12T10:30", "2026-11-12T10:30:00+02:00", "not-a-date"]) {
      expect(createGuestAppointmentSchema.safeParse({ ...validInput, startsAt }).success).toBe(false);
    }
  });

  it("rejects patient identifiers, MRNs, source, price, room, and status from the public client", () => {
    for (const extra of [
      { patientId: "must-not-link" },
      { mrn: "MRN-UNVERIFIED" },
      { source: "PATIENT_PORTAL" },
      { bookedPrice: 1 },
      { consultationRoomId: "client-room" },
      { status: "CONFIRMED" },
    ]) {
      expect(createGuestAppointmentSchema.safeParse({ ...validInput, ...extra }).success).toBe(false);
    }
  });
});
