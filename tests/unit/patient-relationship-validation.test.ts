import { describe, expect, it } from "vitest";
import {
  correctPatientRelationshipSchema,
  createPatientRelationshipSchema,
  deactivatePatientRelationshipSchema,
  verifyPatientLegalGuardianSchema,
} from "../../src/server/patient-management/patient-relationship-validation";

describe("patient family relationship validation", () => {
  it("accepts a directed parent relationship", () => {
    expect(createPatientRelationshipSchema.safeParse({
      relatedPatientId: "patient-parent-demo",
      relationshipType: "PARENT",
    }).success).toBe(true);
  });

  it("accepts only the existing patient relationship catalog", () => {
    for (const relationshipType of ["PARENT", "CHILD", "SPOUSE", "SIBLING", "OTHER"]) {
      expect(createPatientRelationshipSchema.safeParse({
        relatedPatientId: "patient-related-demo",
        relationshipType,
      }).success).toBe(true);
    }
    expect(createPatientRelationshipSchema.safeParse({
      relatedPatientId: "patient-related-demo",
      relationshipType: "GUARDIAN",
    }).success).toBe(false);
  });

  it("rejects additional client-controlled relationship fields", () => {
    expect(createPatientRelationshipSchema.safeParse({
      relatedPatientId: "patient-related-demo",
      relationshipType: "PARENT",
      isLegalGuardian: true,
    }).success).toBe(false);
  });

  it("requires an allowed evidence type and an existing-document identifier", () => {
    expect(verifyPatientLegalGuardianSchema.safeParse({
      evidenceType: "BIRTH_CERTIFICATE",
      evidenceAttachmentId: "attachment-demo",
    }).success).toBe(true);
    expect(verifyPatientLegalGuardianSchema.safeParse({
      evidenceType: "BIRTH_CERTIFICATE",
    }).success).toBe(false);
  });

  it("rejects unsupported evidence types and unknown request properties", () => {
    expect(verifyPatientLegalGuardianSchema.safeParse({
      evidenceType: "NATIONAL_ID_NUMBER",
      evidenceAttachmentId: "attachment-demo",
    }).success).toBe(false);
    expect(verifyPatientLegalGuardianSchema.safeParse({
      evidenceType: "COURT_ORDER",
      evidenceAttachmentId: "attachment-demo",
      nationalId: "not-accepted",
    }).success).toBe(false);
  });
});


describe("patient family relationship lifecycle validation", () => {
  it("accepts a supported relationship correction with a controlled reason code", () => {
    expect(correctPatientRelationshipSchema.safeParse({
      relationshipType: "PARENT",
      reasonCode: "DATA_ENTRY_ERROR",
    }).success).toBe(true);
  });

  it("rejects free-text correction reasons and unsupported relationship types", () => {
    expect(correctPatientRelationshipSchema.safeParse({
      relationshipType: "GUARDIAN",
      reasonCode: "DATA_ENTRY_ERROR",
    }).success).toBe(false);
    expect(correctPatientRelationshipSchema.safeParse({
      relationshipType: "PARENT",
      reasonCode: "DATA_ENTRY_ERROR",
      details: "unbounded personal information",
    }).success).toBe(false);
  });

  it("accepts only a controlled deactivation reason code", () => {
    expect(deactivatePatientRelationshipSchema.safeParse({ reasonCode: "DUPLICATE_RELATIONSHIP" }).success).toBe(true);
    expect(deactivatePatientRelationshipSchema.safeParse({ reasonCode: "FREE_TEXT" }).success).toBe(false);
    expect(deactivatePatientRelationshipSchema.safeParse({ reasonCode: "OTHER", details: "personal details" }).success).toBe(false);
  });
});
