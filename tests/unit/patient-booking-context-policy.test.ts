import { describe, expect, it } from "vitest";

import { buildBookablePatientOptions } from "../../src/server/appointments/patient-booking-context-policy";
import type { BookingContextGrant } from "../../src/server/appointments/patient-booking-context-policy";

const now = new Date("2026-11-12T12:00:00.000Z");
const actor = {
  id: "patient-actor",
  firstName: "Alex",
  lastName: "Patient",
  isActive: true,
};

function grant(overrides: Partial<BookingContextGrant["grant"]> = {}, subjectOverrides: Partial<BookingContextGrant["subjectPatient"]> = {}): BookingContextGrant {
  return {
    subjectPatient: {
      id: "patient-subject",
      firstName: "Jamie",
      lastName: "Patient",
      isActive: true,
      dateOfBirth: new Date("2015-02-03T00:00:00.000Z"),
      ...subjectOverrides,
    },
    relationshipType: "CHILD",
    grant: {
      status: "ACTIVE",
      verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      verifiedByEmployeeId: "employee-verifier",
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      revokedAt: null,
      approvedByPatientId: null,
      approvedAt: null,
      scopes: ["BOOK_APPOINTMENTS"],
      relationshipIsActive: true,
      relationshipIsLegalGuardian: true,
      relationshipGuardianVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      relationshipGuardianVerifiedByEmployeeId: "employee-verifier",
      ...overrides,
    },
  };
}

describe("buildBookablePatientOptions", () => {
  it("always includes only the authenticated active patient as self", () => {
    const result = buildBookablePatientOptions({ actor, grants: [], now });
    expect(result).toEqual([
      {
        id: "patient-actor",
        displayName: "Alex Patient",
        isSelf: true,
        relationshipType: null,
      },
    ]);
  });

  it("includes an active minor only with verified guardian evidence and booking scope", () => {
    const result = buildBookablePatientOptions({ actor, grants: [grant()], now });
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: "patient-subject", isSelf: false, relationshipType: "CHILD" });
  });

  it("excludes grants without the exact booking scope", () => {
    const result = buildBookablePatientOptions({ actor, grants: [grant({ scopes: ["VIEW_MEDICAL_RECORDS"] })], now });
    expect(result.map((item) => item.id)).toEqual([actor.id]);
  });

  it("excludes pending, expired, revoked, and inactive relationships", () => {
    const candidates = [
      grant({ status: "PENDING" }),
      grant({ expiresAt: new Date("2026-11-12T11:59:59.000Z") }),
      grant({ revokedAt: new Date("2026-11-01T00:00:00.000Z") }),
      grant({ relationshipIsActive: false }),
      grant({}, { isActive: false }),
    ];
    const result = buildBookablePatientOptions({ actor, grants: candidates, now });
    expect(result.map((item) => item.id)).toEqual([actor.id]);
  });

  it("excludes an adult delegation without explicit patient approval", () => {
    const adultGrant = grant({}, { dateOfBirth: new Date("1980-01-01T00:00:00.000Z") });
    const result = buildBookablePatientOptions({ actor, grants: [adultGrant], now });
    expect(result.map((item) => item.id)).toEqual([actor.id]);
  });

  it("includes an adult delegation only after the subject patient approves it", () => {
    const adultGrant = grant(
      {
        approvedByPatientId: "patient-subject",
        approvedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      { dateOfBirth: new Date("1980-01-01T00:00:00.000Z") },
    );
    const result = buildBookablePatientOptions({ actor, grants: [adultGrant], now });
    expect(result.map((item) => item.id)).toEqual([actor.id, "patient-subject"]);
  });

  it("fails closed when the authenticated actor is inactive", () => {
    const result = buildBookablePatientOptions({
      actor: { ...actor, isActive: false },
      grants: [grant()],
      now,
    });
    expect(result).toEqual([]);
  });
});
