import { describe, expect, it } from "vitest";
import { decideDoctorEncounterCompletion, decideDoctorNursingTaskResolution, decideNurseTaskAction, decideNursingTaskAssignment, isAppointmentQueueSourceConsistent } from "../../src/server/appointments/nursing-workflow-policy";

const assignment = { doctorActive: true, doctorHasRole: true, doctorProfileId: "doctor-1", encounterExists: true, encounterDoctorId: "doctor-1", encounterStatus: "IN_PROGRESS", encounterSourceConsistent: true, nurseActive: true, nurseHasRole: true, taskType: "RECORD_VITAL_SIGNS" };

describe("nursing task assignment policy", () => {
  it("allows the assigned Doctor to create a task for an active Nurse", () => expect(decideNursingTaskAssignment(assignment)).toEqual({ kind: "ALLOW" }));
  it("rejects inactive or non-Doctor actors", () => expect(decideNursingTaskAssignment({ ...assignment, doctorHasRole: false })).toMatchObject({ kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" }));
  it("rejects an Encounter owned by another Doctor", () => expect(decideNursingTaskAssignment({ ...assignment, encounterDoctorId: "doctor-2" })).toMatchObject({ kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" }));
  it("rejects a completed Encounter", () => expect(decideNursingTaskAssignment({ ...assignment, encounterStatus: "COMPLETED" })).toMatchObject({ kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" }));
  it("rejects inconsistent visit source data", () => expect(decideNursingTaskAssignment({ ...assignment, encounterSourceConsistent: false })).toMatchObject({ kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" }));
  it("rejects inactive employees or employees without the Nurse role", () => expect(decideNursingTaskAssignment({ ...assignment, nurseHasRole: false })).toMatchObject({ kind: "REJECT", code: "ASSIGNED_NURSE_NOT_AVAILABLE" }));
  it("rejects unsupported task types", () => expect(decideNursingTaskAssignment({ ...assignment, taskType: "DIAGNOSE" })).toMatchObject({ kind: "REJECT", code: "NURSING_TASK_TYPE_INVALID" }));
});

const nurseAction = { nurseActive: true, nurseHasRole: true, assignedToEmployeeId: "nurse-1", actorEmployeeId: "nurse-1", encounterStatus: "IN_PROGRESS", taskStatus: "PENDING" as const, taskType: "RECORD_VITAL_SIGNS" as const, action: "START" as const, hasRecordedVitals: false };
describe("Nurse task transition policy", () => {
  it("allows the assigned active Nurse to start a pending task", () => expect(decideNurseTaskAction(nurseAction)).toEqual({ kind: "ALLOW" }));
  it("does not allow a different Nurse to act on the task", () => expect(decideNurseTaskAction({ ...nurseAction, actorEmployeeId: "nurse-2" })).toMatchObject({ kind: "REJECT", code: "NURSING_TASK_NOT_FOUND" }));
  it("does not allow an inactive employee or non-Nurse", () => expect(decideNurseTaskAction({ ...nurseAction, nurseHasRole: false })).toMatchObject({ kind: "REJECT", code: "NURSE_WORKSPACE_ACCESS_REQUIRED" }));
  it("does not allow task work after Encounter completion", () => expect(decideNurseTaskAction({ ...nurseAction, encounterStatus: "COMPLETED" })).toMatchObject({ kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" }));
  it("does not start a task twice", () => expect(decideNurseTaskAction({ ...nurseAction, taskStatus: "IN_PROGRESS" })).toMatchObject({ kind: "REJECT", code: "NURSING_TASK_NOT_STARTABLE" }));
  it("requires a vital-sign record before completing a vital-sign task", () => expect(decideNurseTaskAction({ ...nurseAction, action: "COMPLETE", taskStatus: "IN_PROGRESS" })).toMatchObject({ kind: "REJECT", code: "NURSING_VITALS_REQUIRED" }));
  it("allows completion once vital signs are recorded", () => expect(decideNurseTaskAction({ ...nurseAction, action: "COMPLETE", taskStatus: "IN_PROGRESS", hasRecordedVitals: true })).toEqual({ kind: "ALLOW" }));
  it("allows an in-progress task to be escalated", () => expect(decideNurseTaskAction({ ...nurseAction, action: "ESCALATE", taskStatus: "IN_PROGRESS" })).toEqual({ kind: "ALLOW" }));
  it("rejects completion from a task that is not in progress", () => expect(decideNurseTaskAction({ ...nurseAction, action: "COMPLETE" })).toMatchObject({ kind: "REJECT", code: "NURSING_TASK_NOT_IN_PROGRESS" }));
});

const resolveTask = { doctorActive: true, doctorHasRole: true, doctorProfileId: "doctor-1", encounterExists: true, encounterDoctorId: "doctor-1", encounterStatus: "IN_PROGRESS", taskBelongsToEncounter: true, taskStatus: "ESCALATED" as const, action: "RESUME" as const };
describe("Doctor nursing-task resolution policy", () => {
  it("allows the Encounter's Doctor to resume an escalated task", () => expect(decideDoctorNursingTaskResolution(resolveTask)).toEqual({ kind: "ALLOW" }));
  it("allows the Encounter's Doctor to cancel an escalated task", () => expect(decideDoctorNursingTaskResolution({ ...resolveTask, action: "CANCEL" })).toEqual({ kind: "ALLOW" }));
  it("rejects a foreign Doctor", () => expect(decideDoctorNursingTaskResolution({ ...resolveTask, encounterDoctorId: "doctor-2" })).toMatchObject({ kind: "REJECT", code: "NURSING_TASK_NOT_FOUND" }));
  it("does not resume a task that is not escalated", () => expect(decideDoctorNursingTaskResolution({ ...resolveTask, taskStatus: "IN_PROGRESS" })).toMatchObject({ kind: "REJECT", code: "NURSING_TASK_NOT_ESCALATED" }));
  it("does not cancel completed tasks", () => expect(decideDoctorNursingTaskResolution({ ...resolveTask, taskStatus: "COMPLETED", action: "CANCEL" })).toMatchObject({ kind: "REJECT", code: "NURSING_TASK_NOT_CANCELLABLE" }));
});

const completion = { doctorActive: true, doctorHasRole: true, doctorProfileId: "doctor-1", encounterExists: true, encounterDoctorId: "doctor-1", encounterStatus: "IN_PROGRESS", completedAtExists: false, encounterSourceConsistent: true, signedInitialNoteCount: 1, signedInitialNoteAuthorEmployeeId: "employee-1", actorEmployeeId: "employee-1", openNursingTaskCount: 0, draftPrescriptionCount: 0 };
describe("Doctor Encounter completion policy", () => {
  it("allows completion when all closure requirements are met", () => expect(decideDoctorEncounterCompletion(completion)).toEqual({ kind: "ALLOW" }));
  it("requires a single signed initial note authored by the current Doctor", () => expect(decideDoctorEncounterCompletion({ ...completion, signedInitialNoteCount: 0 })).toMatchObject({ kind: "REJECT", code: "SIGNED_INITIAL_NOTE_REQUIRED" }));
  it("rejects an initial note signed by another author", () => expect(decideDoctorEncounterCompletion({ ...completion, signedInitialNoteAuthorEmployeeId: "employee-2" })).toMatchObject({ kind: "REJECT", code: "SIGNED_INITIAL_NOTE_REQUIRED" }));
  it("requires open Nursing tasks to be resolved", () => expect(decideDoctorEncounterCompletion({ ...completion, openNursingTaskCount: 1 })).toMatchObject({ kind: "REJECT", code: "NURSING_TASKS_PENDING" }));
  it("requires draft prescriptions to be issued or otherwise resolved", () => expect(decideDoctorEncounterCompletion({ ...completion, draftPrescriptionCount: 1 })).toMatchObject({ kind: "REJECT", code: "DRAFT_PRESCRIPTIONS_PENDING" }));
  it("rejects an already completed Encounter", () => expect(decideDoctorEncounterCompletion({ ...completion, encounterStatus: "COMPLETED", completedAtExists: true })).toMatchObject({ kind: "REJECT", code: "ENCOUNTER_NOT_COMPLETABLE" }));
  it("rejects inconsistent source records", () => expect(decideDoctorEncounterCompletion({ ...completion, encounterSourceConsistent: false })).toMatchObject({ kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" }));
});


const appointmentQueueSource = {
  encounterPatientId: "patient-1",
  encounterDoctorId: "doctor-1",
  encounterStatus: "IN_PROGRESS" as const,
  appointmentId: "appointment-1",
  appointmentPatientId: "patient-1",
  appointmentDoctorId: "doctor-1",
  appointmentStatus: "IN_CONSULTATION",
  appointmentCompletedAtExists: false,
  queueEntry: {
    patientId: "patient-1",
    doctorId: "doctor-1",
    appointmentId: "appointment-1",
    type: "APPOINTMENT",
    status: "IN_SERVICE",
    serviceStartedAtExists: true,
    completedAtExists: false,
  },
};

describe("Appointment Encounter queue-source consistency", () => {
  it("accepts an in-progress appointment whose queue ticket is in service", () => expect(isAppointmentQueueSourceConsistent(appointmentQueueSource)).toBe(true));
  it("accepts a completed appointment whose queue ticket is completed", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, encounterStatus: "COMPLETED", appointmentStatus: "COMPLETED", appointmentCompletedAtExists: true, queueEntry: { ...appointmentQueueSource.queueEntry, status: "COMPLETED", completedAtExists: true } })).toBe(true));
  it("rejects an appointment without its queue ticket", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: null })).toBe(false));
  it("rejects a queue ticket linked to a different appointment", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: { ...appointmentQueueSource.queueEntry, appointmentId: "appointment-2" } })).toBe(false));
  it("rejects a queue ticket for a different patient", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: { ...appointmentQueueSource.queueEntry, patientId: "patient-2" } })).toBe(false));
  it("rejects an appointment whose patient identity has not been resolved", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, appointmentPatientId: null })).toBe(false));
  it("rejects a queue ticket for a different Doctor", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: { ...appointmentQueueSource.queueEntry, doctorId: "doctor-2" } })).toBe(false));
  it("rejects a walk-in queue ticket as an appointment source", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: { ...appointmentQueueSource.queueEntry, type: "WALK_IN" } })).toBe(false));
  it("rejects queue tickets which are not in service before completion", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: { ...appointmentQueueSource.queueEntry, status: "WAITING" } })).toBe(false));
  it("requires the consultation start timestamp", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: { ...appointmentQueueSource.queueEntry, serviceStartedAtExists: false } })).toBe(false));
  it("rejects mismatched completion timestamps", () => expect(isAppointmentQueueSourceConsistent({ ...appointmentQueueSource, queueEntry: { ...appointmentQueueSource.queueEntry, completedAtExists: true } })).toBe(false));
});
