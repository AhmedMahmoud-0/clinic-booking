import { describe, expect, it } from 'vitest';
import { doctorClinicalNoteAmendmentRequestSchema } from '../../src/server/appointments/doctor-clinical-note-amendment-validation';

const validRequest = {
  reason: 'Corrected a transcription error after reviewing the signed note.',
  changes: { assessment: 'Updated assessment wording.' },
};

describe('Doctor clinical-note amendment validation', () => {
  it('accepts a reason and one supported correction field', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it('accepts explicit null for an optional SOAP field', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({
      reason: validRequest.reason,
      changes: { treatmentPlan: null },
    }).success).toBe(true);
  });

  it('accepts a correction to the chief complaint', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({
      reason: validRequest.reason,
      changes: { chiefComplaint: 'Revised chief complaint.' },
    }).success).toBe(true);
  });

  it('rejects a blank or too-short reason', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({ ...validRequest, reason: '  ' }).success).toBe(false);
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({ ...validRequest, reason: 'fix' }).success).toBe(false);
  });

  it('rejects an empty changes object', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({ reason: validRequest.reason, changes: {} }).success).toBe(false);
  });

  it('rejects a blank corrected chief complaint', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({
      reason: validRequest.reason,
      changes: { chiefComplaint: '   ' },
    }).success).toBe(false);
  });

  it('rejects unsupported clinical fields', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({
      reason: validRequest.reason,
      changes: { assessment: 'Changed', diagnosis: 'forged' },
    }).success).toBe(false);
  });

  it('rejects caller-supplied historical snapshots, author, and timestamp', () => {
    expect(doctorClinicalNoteAmendmentRequestSchema.safeParse({
      ...validRequest,
      previousContent: 'forged',
      correctedContent: 'forged',
      createdByEmployeeId: 'employee_forged',
      createdAt: '2026-11-10T00:00:00.000Z',
    }).success).toBe(false);
  });
});
