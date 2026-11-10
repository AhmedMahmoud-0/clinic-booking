import { describe, expect, it } from "vitest";

import {
  isAppointmentSlotSelected,
  isPatientBookingAuthorized,
  type PatientBookingAuthorityInput,
} from "../../src/server/appointments/appointment-booking-policy";

const now = new Date("2026-11-08T12:00:00.000Z");
const actorPatientId = "patient_actor";
const subjectPatientId = "patient_subject";

function baseInput(overrides: Partial<PatientBookingAuthorityInput> = {}): PatientBookingAuthorityInput {
  return {
    actorPatientId,
    subjectPatientId,
    actorIsActive: true,
    subjectIsActive: true,
    subjectDateOfBirth: new Date("2012-03-10T00:00:00.000Z"),
    now,
    grant: {
      status: "ACTIVE",
      verifiedAt: new Date("2026-11-01T10:00:00.000Z"),
      verifiedByEmployeeId: "employee_reception",
      expiresAt: new Date("2027-11-01T10:00:00.000Z"),
      revokedAt: null,
      approvedByPatientId: null,
      approvedAt: null,
      scopes: ["BOOK_APPOINTMENTS"],
      relationshipIsActive: true,
      relationshipIsLegalGuardian: true,
      relationshipGuardianVerifiedAt: new Date("2026-10-30T09:00:00.000Z"),
      relationshipGuardianVerifiedByEmployeeId: "employee_reception",
    },
    ...overrides,
  };
}

describe("patient appointment booking authority", () => {
  it("allows an active verified patient actor to book for themself without a grant", () => {
    expect(isPatientBookingAuthorized(baseInput({
      actorPatientId,
      subjectPatientId: actorPatientId,
      grant: null,
    }))).toBe(true);
  });

  it("rejects self-booking by an inactive actor", () => {
    expect(isPatientBookingAuthorized(baseInput({
      actorPatientId,
      subjectPatientId: actorPatientId,
      actorIsActive: false,
      grant: null,
    }))).toBe(false);
  });

  it("rejects booking for an inactive patient record", () => {
    expect(isPatientBookingAuthorized(baseInput({
      subjectIsActive: false,
    }))).toBe(false);
  });

  it("does not treat a family relationship without an access grant as booking authority", () => {
    expect(isPatientBookingAuthorized(baseInput({ grant: null }))).toBe(false);
  });

  it("allows a current verified legal guardian with the exact BOOK_APPOINTMENTS scope to book for a minor", () => {
    expect(isPatientBookingAuthorized(baseInput())).toBe(true);
  });

  it("rejects a minor booking when legal-guardian evidence is missing", () => {
    const input = baseInput();
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? {
        ...input.grant,
        relationshipGuardianVerifiedAt: null,
        relationshipGuardianVerifiedByEmployeeId: null,
      } : null,
    })).toBe(false);
  });

  it("rejects a minor booking when the relationship has been deactivated", () => {
    const input = baseInput();
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? { ...input.grant, relationshipIsActive: false } : null,
    })).toBe(false);
  });

  it("rejects a delegation that does not include BOOK_APPOINTMENTS", () => {
    const input = baseInput();
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? { ...input.grant, scopes: ["VIEW_PROFILE"] } : null,
    })).toBe(false);
  });

  it("rejects pending grants", () => {
    const input = baseInput();
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? { ...input.grant, status: "PENDING" } : null,
    })).toBe(false);
  });

  it("rejects revoked grants", () => {
    const input = baseInput();
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? { ...input.grant, revokedAt: new Date("2026-11-07T10:00:00.000Z") } : null,
    })).toBe(false);
  });

  it("rejects expired grants", () => {
    const input = baseInput();
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? { ...input.grant, expiresAt: new Date("2026-11-08T11:59:59.000Z") } : null,
    })).toBe(false);
  });

  it("requires explicit subject-patient approval for adult delegation", () => {
    const input = baseInput({ subjectDateOfBirth: new Date("1990-03-10T00:00:00.000Z") });
    expect(isPatientBookingAuthorized(input)).toBe(false);
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? {
        ...input.grant,
        relationshipIsLegalGuardian: false,
        relationshipGuardianVerifiedAt: null,
        relationshipGuardianVerifiedByEmployeeId: null,
        approvedByPatientId: subjectPatientId,
        approvedAt: new Date("2026-11-02T10:00:00.000Z"),
      } : null,
    })).toBe(true);
  });

  it("rejects a different adult patient's booking when the subject did not approve it", () => {
    const input = baseInput({ subjectDateOfBirth: new Date("1990-03-10T00:00:00.000Z") });
    expect(isPatientBookingAuthorized({
      ...input,
      grant: input.grant ? {
        ...input.grant,
        relationshipIsLegalGuardian: false,
        relationshipGuardianVerifiedAt: null,
        relationshipGuardianVerifiedByEmployeeId: null,
      } : null,
    })).toBe(false);
  });
});

describe("appointment slot selection", () => {
  const slots = [
    { startsAt: "2026-11-12T08:30:00.000Z", endsAt: "2026-11-12T09:00:00.000Z" },
    { startsAt: "2026-11-12T09:00:00.000Z", endsAt: "2026-11-12T09:30:00.000Z" },
  ];

  it("selects only an exact start instant returned by the availability endpoint", () => {
    expect(isAppointmentSlotSelected(slots, new Date("2026-11-12T09:00:00.000Z"))).toEqual({
      startsAt: new Date("2026-11-12T09:00:00.000Z"),
      endsAt: new Date("2026-11-12T09:30:00.000Z"),
    });
  });

  it("rejects a timestamp between advertised slots", () => {
    expect(isAppointmentSlotSelected(slots, new Date("2026-11-12T08:45:00.000Z"))).toBeNull();
  });

  it("rejects invalid or reversed slot instants", () => {
    expect(isAppointmentSlotSelected([
      { startsAt: "bad", endsAt: "2026-11-12T09:00:00.000Z" },
      { startsAt: "2026-11-12T09:00:00.000Z", endsAt: "bad" },
    ], new Date("2026-11-12T09:00:00.000Z"))).toBeNull();
  });
});
