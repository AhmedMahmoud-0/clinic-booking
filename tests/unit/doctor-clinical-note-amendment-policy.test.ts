import { describe, expect, it } from 'vitest';
import { decideDoctorClinicalNoteAmendment } from '../../src/server/appointments/doctor-clinical-note-amendment-policy';

const validSignedNote = {
  employeeStatus: 'ACTIVE',
  activeRoles: ['DOCTOR'],
  doctorProfileId: 'doctor_1',
  encounterExists: true,
  encounterDoctorId: 'doctor_1',
  encounterStatus: 'IN_PROGRESS',
  encounterLifecycleIsConsistent: true,
  noteCount: 1,
  noteType: 'INITIAL_ASSESSMENT',
  noteStatus: 'SIGNED',
  noteSignedAtExists: true,
  noteAuthorEmployeeId: 'employee_1',
  actorEmployeeId: 'employee_1',
};

describe('Doctor clinical-note amendment policy', () => {
  it('allows the original Doctor to amend their signed in-progress Encounter', () => {
    expect(decideDoctorClinicalNoteAmendment(validSignedNote)).toEqual({ kind: 'AMEND' });
  });

  it('allows the original Doctor to amend a signed note after Encounter completion', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, encounterStatus: 'COMPLETED' })).toEqual({ kind: 'AMEND' });
  });

  it('rejects inactive employees', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, employeeStatus: 'INACTIVE' })).toEqual({ kind: 'REJECT', code: 'DOCTOR_WORKSPACE_ACCESS_REQUIRED' });
  });

  it('rejects employees without an active Doctor role', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, activeRoles: ['NURSE'] })).toEqual({ kind: 'REJECT', code: 'DOCTOR_WORKSPACE_ACCESS_REQUIRED' });
  });

  it('rejects a missing Doctor profile', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, doctorProfileId: null })).toEqual({ kind: 'REJECT', code: 'DOCTOR_PROFILE_REQUIRED' });
  });

  it('conceals a missing Encounter', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, encounterExists: false })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_FOUND' });
  });

  it('conceals an Encounter assigned to another Doctor', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, encounterDoctorId: 'doctor_2' })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_FOUND' });
  });

  it('rejects cancelled Encounters', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, encounterStatus: 'CANCELLED' })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_AMENDABLE' });
  });

  it('rejects unknown Encounter states', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, encounterStatus: 'PENDING' })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_NOT_AMENDABLE' });
  });

  it('rejects inconsistent Encounter completion timestamps or visit origin', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, encounterLifecycleIsConsistent: false })).toEqual({ kind: 'REJECT', code: 'ENCOUNTER_SOURCE_INCONSISTENT' });
  });

  it('rejects a missing initial assessment', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteCount: 0, noteType: null })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_MISSING' });
  });

  it('rejects duplicate initial assessments', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteCount: 2 })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_AMBIGUOUS' });
  });

  it('rejects an invalid note count', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteCount: -1 })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_STATE_INCONSISTENT' });
  });

  it('rejects a non-initial note', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteType: 'PROGRESS' })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_STATE_INCONSISTENT' });
  });

  it('rejects an unsigned draft', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteStatus: 'DRAFT', noteSignedAtExists: false })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_NOT_SIGNED' });
  });

  it('rejects a signed note without a signature timestamp as an inconsistent state', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteSignedAtExists: false })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_STATE_INCONSISTENT' });
  });

  it('rejects inconsistent note lifecycle states', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteStatus: 'CANCELLED' })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_STATE_INCONSISTENT' });
  });

  it('rejects a Doctor other than the original note author', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, noteAuthorEmployeeId: 'employee_2' })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_AUTHOR_MISMATCH' });
  });

  it('rejects an empty actor identity', () => {
    expect(decideDoctorClinicalNoteAmendment({ ...validSignedNote, actorEmployeeId: '' })).toEqual({ kind: 'REJECT', code: 'INITIAL_NOTE_AUTHOR_MISMATCH' });
  });
});
