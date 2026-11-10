import { describe, expect, it } from "vitest";

import { ROLE_PERMISSIONS, getEmployeePermissions, hasEmployeePermission, hasEmployeeRole } from "../../src/server/auth/authorization/policy";
import { isPatientDelegationAllowed } from "../../src/server/auth/authorization/delegation-policy";
import { CLINIC_PERMISSIONS, type PatientAccessScope } from "../../src/server/auth/authorization/types";

const now = new Date("2026-11-06T12:00:00.000Z");

function makeDelegation(
  overrides: Partial<Parameters<typeof isPatientDelegationAllowed>[0]> = {},
) {
  return {
    subjectPatientId: "patient-subject-demo",
    requiredScope: "VIEW_MEDICAL_RECORDS" as PatientAccessScope,
    grantedScopes: ["VIEW_MEDICAL_RECORDS"],
    grantStatus: "ACTIVE",
    grantVerifiedAt: new Date("2026-11-01T10:00:00.000Z"),
    grantVerifiedByEmployeeId: "employee-verifier-demo",
    grantExpiresAt: null,
    grantRevokedAt: null,
    approvedByPatientId: null,
    approvedAt: null,
    subjectDateOfBirth: new Date("2015-03-15T00:00:00.000Z"),
    relationshipIsActive: true,
    relationshipIsLegalGuardian: true,
    relationshipGuardianVerifiedAt: new Date("2026-10-30T10:00:00.000Z"),
    relationshipGuardianVerifiedByEmployeeId: "employee-guardian-verifier-demo",
    now,
    ...overrides,
  };
}

describe("MERUNO employee authorization policy", () => {
  it("allows Reception to link patient accounts", () => {
    expect(
      hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_ACCOUNT_LINK),
    ).toBe(true);
    expect(hasEmployeeRole(["RECEPTION"], ["RECEPTION"])).toBe(true);
  });

  it("allows only System Admin to link employee accounts", () => {
    expect(
      hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.EMPLOYEE_ACCOUNT_LINK),
    ).toBe(true);
    expect(
      hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.EMPLOYEE_ACCOUNT_LINK),
    ).toBe(false);
  });

  it("does not grant clinical record access to System Admin", () => {
    expect(
      hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ),
    ).toBe(false);
  });

  it("keeps Clinic Manager separate from technical System Admin", () => {
    expect(
      hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.SYSTEM_USER_MANAGE),
    ).toBe(false);
    expect(
      hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.REFUND_APPROVE),
    ).toBe(true);
  });

  it("allows report approval to Radiologist, not general Radiology Staff", () => {
    expect(
      hasEmployeePermission(["RADIOLOGIST"], CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE),
    ).toBe(true);
    expect(
      hasEmployeePermission(["RADIOLOGY_STAFF"], CLINIC_PERMISSIONS.RADIOLOGY_REPORT_APPROVE),
    ).toBe(false);
  });

  it("does not grant Cashier access to clinical records", () => {
    expect(
      hasEmployeePermission(["CASHIER"], CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ),
    ).toBe(false);
  });

  it("ignores unknown role values and merges permissions without duplicates", () => {
    const permissions = getEmployeePermissions(["RECEPTION", "UNKNOWN_ROLE", "SYSTEM_ADMIN"]);
    expect(permissions).toContain(CLINIC_PERMISSIONS.PATIENT_ACCOUNT_LINK);
    expect(permissions).toContain(CLINIC_PERMISSIONS.SYSTEM_USER_MANAGE);
    expect(new Set(permissions).size).toBe(permissions.length);
    expect(ROLE_PERMISSIONS.SYSTEM_ADMIN).not.toContain(
      CLINIC_PERMISSIONS.CLINICAL_ASSIGNED_READ,
    );
  });
});

describe("MERUNO patient delegation policy", () => {
  it("allows a verified legal guardian of a minor for an explicitly granted scope", () => {
    expect(isPatientDelegationAllowed(makeDelegation())).toBe(true);
  });

  it("denies a minor delegation when legal-guardian verification is missing", () => {
    expect(
      isPatientDelegationAllowed(
        makeDelegation({ relationshipGuardianVerifiedByEmployeeId: null }),
      ),
    ).toBe(false);
  });

  it("requires the subject adult patient to approve adult delegation", () => {
    const adultDob = new Date("1990-03-15T00:00:00.000Z");
    expect(
      isPatientDelegationAllowed(
        makeDelegation({ subjectDateOfBirth: adultDob }),
      ),
    ).toBe(false);

    expect(
      isPatientDelegationAllowed(
        makeDelegation({
          subjectDateOfBirth: adultDob,
          approvedByPatientId: "patient-subject-demo",
          approvedAt: new Date("2026-11-01T10:00:00.000Z"),
          grantVerifiedAt: null,
          grantVerifiedByEmployeeId: null,
        }),
      ),
    ).toBe(true);
  });

  it("denies a scope that was not granted", () => {
    expect(
      isPatientDelegationAllowed(
        makeDelegation({ grantedScopes: ["VIEW_PROFILE"] }),
      ),
    ).toBe(false);
  });

  it("denies expired, revoked, or unverified minor-guardian grants", () => {
    expect(
      isPatientDelegationAllowed(
        makeDelegation({ grantExpiresAt: new Date("2026-11-06T11:59:59.000Z") }),
      ),
    ).toBe(false);
    expect(
      isPatientDelegationAllowed(
        makeDelegation({ grantRevokedAt: new Date("2026-11-05T10:00:00.000Z") }),
      ),
    ).toBe(false);
    expect(
      isPatientDelegationAllowed(
        makeDelegation({ grantVerifiedByEmployeeId: null }),
      ),
    ).toBe(false);
  });

  it("denies delegated access when the family relationship is inactive, including adult-approved grants", () => {
    expect(isPatientDelegationAllowed(makeDelegation({ relationshipIsActive: false }))).toBe(false);

    expect(isPatientDelegationAllowed(makeDelegation({
      subjectDateOfBirth: new Date("1990-03-15T00:00:00.000Z"),
      approvedByPatientId: "patient-subject-demo",
      approvedAt: new Date("2026-11-01T10:00:00.000Z"),
      grantVerifiedAt: null,
      grantVerifiedByEmployeeId: null,
      relationshipIsActive: false,
    }))).toBe(false);
  });

  it("fails closed when the subject patient date of birth is unavailable", () => {
    expect(
      isPatientDelegationAllowed(
        makeDelegation({ subjectDateOfBirth: null }),
      ),
    ).toBe(false);
  });
});

describe("MERUNO patient delegation management permission", () => {
  it("allows Reception and System Admin to manage patient delegation grants", () => {
    expect(
      hasEmployeePermission(["RECEPTION"], CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE),
    ).toBe(true);
    expect(
      hasEmployeePermission(["SYSTEM_ADMIN"], CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE),
    ).toBe(true);
  });

  it("does not grant patient delegation management to unrelated staff roles", () => {
    expect(
      hasEmployeePermission(["DOCTOR"], CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE),
    ).toBe(false);
    expect(
      hasEmployeePermission(["CLINIC_MANAGER"], CLINIC_PERMISSIONS.PATIENT_DELEGATION_MANAGE),
    ).toBe(false);
  });
});
