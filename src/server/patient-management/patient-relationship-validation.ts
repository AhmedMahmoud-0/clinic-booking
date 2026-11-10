import { z } from "zod";

export const PATIENT_RELATIONSHIP_TYPES = [
  "PARENT",
  "CHILD",
  "SPOUSE",
  "SIBLING",
  "OTHER",
] as const;

export const PATIENT_GUARDIAN_EVIDENCE_TYPES = [
  "BIRTH_CERTIFICATE",
  "FAMILY_REGISTRY_EXTRACT",
  "COURT_ORDER",
  "CUSTODY_ORDER",
  "OTHER_OFFICIAL_DOCUMENT",
] as const;

export const PATIENT_RELATIONSHIP_CORRECTION_REASONS = [
  "DATA_ENTRY_ERROR",
  "DOCUMENT_REVIEW",
  "PATIENT_REQUEST",
  "OTHER",
] as const;

export const PATIENT_RELATIONSHIP_DEACTIVATION_REASONS = [
  "DUPLICATE_RELATIONSHIP",
  "RELATIONSHIP_NO_LONGER_VALID",
  "PATIENT_REQUEST",
  "SOURCE_RECORD_CORRECTION",
  "OTHER",
] as const;

export const createPatientRelationshipSchema = z.object({
  relatedPatientId: z.string().trim().min(1).max(80),
  relationshipType: z.enum(PATIENT_RELATIONSHIP_TYPES),
}).strict();

export const correctPatientRelationshipSchema = z.object({
  relationshipType: z.enum(PATIENT_RELATIONSHIP_TYPES),
  reasonCode: z.enum(PATIENT_RELATIONSHIP_CORRECTION_REASONS),
}).strict();

export const deactivatePatientRelationshipSchema = z.object({
  reasonCode: z.enum(PATIENT_RELATIONSHIP_DEACTIVATION_REASONS),
}).strict();

export const verifyPatientLegalGuardianSchema = z.object({
  evidenceType: z.enum(PATIENT_GUARDIAN_EVIDENCE_TYPES),
  evidenceAttachmentId: z.string().trim().min(1).max(80),
}).strict();

export type CreatePatientRelationshipInput = z.infer<typeof createPatientRelationshipSchema>;
export type CorrectPatientRelationshipInput = z.infer<typeof correctPatientRelationshipSchema>;
export type DeactivatePatientRelationshipInput = z.infer<typeof deactivatePatientRelationshipSchema>;
export type VerifyPatientLegalGuardianInput = z.infer<typeof verifyPatientLegalGuardianSchema>;
