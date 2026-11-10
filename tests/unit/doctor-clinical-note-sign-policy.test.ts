import { describe, expect, it } from 'vitest';
import { decideDoctorClinicalNoteSign } from '../../src/server/appointments/doctor-clinical-note-sign-policy';

const validDraft = {
  employeeStatus: 'ACTIVE',
  activeRoles: ['DOCTOR'],
  doctorProfileId: 'doctor_1',
  encounterExists: true,
  encounterDoctorId: 'doctor_1',
  encounterStatus: 'IN_PROGRESS',
  encounterCompletedAtExists: false,
  encounterOriginIsConsistent: true,
  noteCount: 1,
  noteStatus: 'DRAFT',
  noteSignedAtExists: false,
  noteAuthorEmployeeId: 'employee_1',
  actorEmployeeId: 'employee_1',
  chiefComplaint: 'Headache',
  hasClinicalContent: true,
};

describe('Doctor clinical-note signing policy', () => {
  it('allows the original Doctor to sign their active Encounter draft', () => {
    expect(decideDoctorClinicalNoteSign(validDraft)).toEqual({ kind: 'SIGN' });
  });

  it('rejects inactive employees', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, employeeStatus: 'INACTIVE' })).toEqual({ kind: 'REJECT', code: 'DOCTOR_WORKSPACE_ACCESS_REQUIRED' });
  });

  it('rejects employees without an active Doctor role', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, activeRoles: ['NURSE'] })).toEqual({ kind: 'REJECT', code: 'DOCTOR_WORKSPACE_ACCESS_REQUIRED' });
  });

  it('rejects a missing Doctor profile', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, doctorProfileId: null })).toEqual({ kind: 'REJECT', code: 'DOCTOR_PROFILE_REQUIRED' });
  });

  it('conceals missing or foreign Encounters', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, encounterExists: false })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_FOUND' });
    expect(decideDoctorClinicalNoteSign({ ...validDraft, encounterDoctorId: 'doctor_2' })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_FOUND' });
  });

  it('rejects completed or non-active Encounters', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, encounterStatus: 'COMPLETED' })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_EDITABLE' });
    expect(decideDoctorClinicalNoteSign({ ...validDraft, encounterCompletedAtExists: true })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_EDITABLE' });
  });

  it('rejects inconsistent appointment or walk-in origin state', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, encounterOriginIsConsistent: false })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_SOURCE_INCONSISTENT' });
  });

  it('rejects a missing initial assessment', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, noteCount: 0 })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_MISSING' });
  });

  it('rejects ambiguous duplicate initial assessments', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, noteCount: 2 })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_AMBIGUOUS' });
  });

  it('rejects an already signed note', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, noteStatus: 'SIGNED', noteSignedAtExists: true })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_ALREADY_SIGNED' });
  });

  it('rejects an inconsistent signature state', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, noteStatus: 'DRAFT', noteSignedAtExists: true })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_STATE_INCONSISTENT' });
    expect(decideDoctorClinicalNoteSign({ ...validDraft, noteStatus: 'SIGNED', noteSignedAtExists: false })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_STATE_INCONSISTENT' });
  });

  it('rejects a signer other than the original author', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, noteAuthorEmployeeId: 'employee_2' })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_AUTHOR_MISMATCH' });
  });

  it('requires a non-empty chief complaint', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, chiefComplaint: '  ' })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_CONTENT_INCOMPLETE' });
  });

  it('requires at least one SOAP section', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, hasClinicalContent: false })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_CONTENT_INCOMPLETE' });
  });

  it('rejects an invalid note count', () => {
    expect(decideDoctorClinicalNoteSign({ ...validDraft, noteCount: -1 })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_STATE_INCONSISTENT' });
  });
});
