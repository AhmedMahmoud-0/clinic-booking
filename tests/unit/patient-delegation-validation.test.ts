import { describe, expect, it } from "vitest";

import { PATIENT_ACCESS_SCOPES } from "../../src/server/auth/authorization/types";
import {
  createPatientDelegationSchema,
  isPatientDelegationExpiryAllowed,
  patientDelegationDecisionSchema,
  patientDelegationRevokeSchema,
  updatePatientDelegationSchema,
} from "../../src/server/auth/delegation/patient-delegation-validation";

const validCreate = {
  subjectPatientId: "patient-subject-01",
  granteePatientId: "patient-grantee-02",
  scopes: ["VIEW_PROFILE", "BOOK_APPOINTMENTS"],
  expiresAt: "2027-01-01T12:00:00.000Z",
  reason: "Verified family relationship",
};

const now = new Date("2026-11-07T12:00:00.000Z");

describe("patient delegation request validation", () => {
  it("accepts a directed patient grant with exact scopes and a finite expiry", () => {
    expect(createPatientDelegationSchema.safeParse(validCreate).success).toBe(true);
  });

  it("rejects a self-delegation", () => {
    expect(
      createPatientDelegationSchema.safeParse({
        ...validCreate,
        granteePatientId: validCreate.subjectPatientId,
      }).success,
    ).toBe(false);
  });

  it("requires at least one scope", () => {
    expect(createPatientDelegationSchema.safeParse({ ...validCreate, scopes: [] }).success).toBe(false);
  });

  it("rejects duplicate scopes", () => {
    expect(
      createPatientDelegationSchema.safeParse({
        ...validCreate,
        scopes: ["VIEW_PROFILE", "VIEW_PROFILE"],
      }).success,
    ).toBe(false);
  });

  it("rejects scopes outside the approved patient access enum", () => {
    expect(
      createPatientDelegationSchema.safeParse({ ...validCreate, scopes: ["ADMIN_ALL"] }).success,
    ).toBe(false);
    expect(PATIENT_ACCESS_SCOPES).toHaveLength(7);
  });

  it("requires an explicit timezone on expiry timestamps", () => {
    expect(
      createPatientDelegationSchema.safeParse({
        ...validCreate,
        expiresAt: "2027-01-01T12:00:00",
      }).success,
    ).toBe(false);
  });

  it("requires a reason with a meaningful minimum length", () => {
    expect(createPatientDelegationSchema.safeParse({ ...validCreate, reason: "no" }).success).toBe(false);
  });

  it("accepts a complete scope and expiry replacement", () => {
    expect(
      updatePatientDelegationSchema.safeParse({
        scopes: ["VIEW_BILLING"],
        expiresAt: "2027-01-01T12:00:00.000Z",
        reason: "Updated access requirements",
      }).success,
    ).toBe(true);
  });

  it("requires at least one scope when updating a grant", () => {
    expect(
      updatePatientDelegationSchema.safeParse({
        scopes: [],
        expiresAt: "2027-01-01T12:00:00.000Z",
        reason: "Updated access requirements",
      }).success,
    ).toBe(false);
  });

  it("accepts an explicit adult approval decision", () => {
    expect(patientDelegationDecisionSchema.safeParse({ decision: "APPROVE" }).success).toBe(true);
  });

  it("accepts an explicit adult rejection decision", () => {
    expect(patientDelegationDecisionSchema.safeParse({ decision: "REJECT" }).success).toBe(true);
  });

  it("rejects unsupported patient decisions", () => {
    expect(patientDelegationDecisionSchema.safeParse({ decision: "PENDING" }).success).toBe(false);
  });

  it("requires a reason for a revocation", () => {
    expect(patientDelegationRevokeSchema.safeParse({ reason: "   " }).success).toBe(false);
    expect(patientDelegationRevokeSchema.safeParse({ reason: "Patient request" }).success).toBe(true);
  });

  it("accepts an expiry within the one-year maximum", () => {
    expect(isPatientDelegationExpiryAllowed(new Date("2027-01-01T12:00:00.000Z"), now)).toBe(true);
  });

  it("rejects an expiry at or before now", () => {
    expect(isPatientDelegationExpiryAllowed(now, now)).toBe(false);
    expect(isPatientDelegationExpiryAllowed(new Date("2026-11-07T11:59:59.000Z"), now)).toBe(false);
  });

  it("rejects an expiry more than one year away", () => {
    expect(isPatientDelegationExpiryAllowed(new Date("2027-11-08T12:00:00.000Z"), now)).toBe(false);
  });
});
