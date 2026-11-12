export type NursingTaskType =
  | "RECORD_VITAL_SIGNS"
  | "REPEAT_VITAL_SIGNS"
  | "PRE_CONSULTATION_ASSESSMENT"
  | "PROCEDURE_PREPARATION"
  | "OTHER";

export type NursingTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ESCALATED" | "CANCELLED";


export function isAppointmentQueueSourceConsistent(input: {
  encounterPatientId: string;
  encounterDoctorId: string;
  encounterStatus: "IN_PROGRESS" | "COMPLETED";
  appointmentId: string;
  appointmentPatientId: string | null;
  appointmentDoctorId: string;
  appointmentStatus: string;
  appointmentCompletedAtExists: boolean;
  queueEntry: {
    patientId: string;
    doctorId: string;
    appointmentId: string | null;
    type: string;
    status: string;
    serviceStartedAtExists: boolean;
    completedAtExists: boolean;
  } | null;
}): boolean {
  const queue = input.queueEntry;
  const completed = input.encounterStatus === "COMPLETED";
  return input.appointmentPatientId !== null
    && input.appointmentPatientId === input.encounterPatientId
    && input.appointmentDoctorId === input.encounterDoctorId
    && input.appointmentStatus === (completed ? "COMPLETED" : "IN_CONSULTATION")
    && input.appointmentCompletedAtExists === completed
    && queue !== null
    && queue.patientId === input.encounterPatientId
    && queue.doctorId === input.encounterDoctorId
    && queue.appointmentId === input.appointmentId
    && queue.type === "APPOINTMENT"
    && queue.status === (completed ? "COMPLETED" : "IN_SERVICE")
    && queue.serviceStartedAtExists
    && queue.completedAtExists === completed;
}

export function decideNursingTaskAssignment(input: {
  doctorActive: boolean;
  doctorHasRole: boolean;
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string | null;
  encounterSourceConsistent: boolean;
  nurseActive: boolean;
  nurseHasRole: boolean;
  taskType: string;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: string } {
  if (!input.doctorActive || !input.doctorHasRole) return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  if (!input.doctorProfileId) return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  if (!input.encounterExists || input.encounterDoctorId !== input.doctorProfileId) return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  if (input.encounterStatus !== "IN_PROGRESS") return { kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" };
  if (!input.encounterSourceConsistent) return { kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" };
  if (!input.nurseActive || !input.nurseHasRole) return { kind: "REJECT", code: "ASSIGNED_NURSE_NOT_AVAILABLE" };
  if (!["RECORD_VITAL_SIGNS", "REPEAT_VITAL_SIGNS", "PRE_CONSULTATION_ASSESSMENT", "PROCEDURE_PREPARATION", "OTHER"].includes(input.taskType)) {
    return { kind: "REJECT", code: "NURSING_TASK_TYPE_INVALID" };
  }
  return { kind: "ALLOW" };
}

export function decideNurseTaskAction(input: {
  nurseActive: boolean;
  nurseHasRole: boolean;
  assignedToEmployeeId: string;
  actorEmployeeId: string;
  encounterStatus: string;
  taskStatus: NursingTaskStatus;
  taskType: NursingTaskType;
  action: "START" | "COMPLETE" | "ESCALATE";
  hasRecordedVitals: boolean;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: string } {
  if (!input.nurseActive || !input.nurseHasRole) return { kind: "REJECT", code: "NURSE_WORKSPACE_ACCESS_REQUIRED" };
  if (!input.actorEmployeeId || input.assignedToEmployeeId !== input.actorEmployeeId) return { kind: "REJECT", code: "NURSING_TASK_NOT_FOUND" };
  if (input.encounterStatus !== "IN_PROGRESS") return { kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" };
  if (input.action === "START") {
    return input.taskStatus === "PENDING" ? { kind: "ALLOW" } : { kind: "REJECT", code: "NURSING_TASK_NOT_STARTABLE" };
  }
  if (input.taskStatus !== "IN_PROGRESS") return { kind: "REJECT", code: "NURSING_TASK_NOT_IN_PROGRESS" };
  if (input.action === "COMPLETE" && (input.taskType === "RECORD_VITAL_SIGNS" || input.taskType === "REPEAT_VITAL_SIGNS") && !input.hasRecordedVitals) {
    return { kind: "REJECT", code: "NURSING_VITALS_REQUIRED" };
  }
  return { kind: "ALLOW" };
}

export function decideDoctorNursingTaskResolution(input: {
  doctorActive: boolean;
  doctorHasRole: boolean;
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string;
  taskBelongsToEncounter: boolean;
  taskStatus: NursingTaskStatus;
  action: "RESUME" | "CANCEL";
}): { kind: "ALLOW" } | { kind: "REJECT"; code: string } {
  if (!input.doctorActive || !input.doctorHasRole) return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  if (!input.doctorProfileId) return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  if (!input.encounterExists || input.encounterDoctorId !== input.doctorProfileId || !input.taskBelongsToEncounter) {
    return { kind: "REJECT", code: "NURSING_TASK_NOT_FOUND" };
  }
  if (input.encounterStatus !== "IN_PROGRESS") return { kind: "REJECT", code: "ENCOUNTER_NOT_EDITABLE" };
  if (input.action === "RESUME" && input.taskStatus !== "ESCALATED") return { kind: "REJECT", code: "NURSING_TASK_NOT_ESCALATED" };
  if (input.action === "CANCEL" && !["PENDING", "IN_PROGRESS", "ESCALATED"].includes(input.taskStatus)) {
    return { kind: "REJECT", code: "NURSING_TASK_NOT_CANCELLABLE" };
  }
  return { kind: "ALLOW" };
}

export function decideDoctorEncounterCompletion(input: {
  doctorActive: boolean;
  doctorHasRole: boolean;
  doctorProfileId: string | null;
  encounterExists: boolean;
  encounterDoctorId: string | null;
  encounterStatus: string;
  completedAtExists: boolean;
  encounterSourceConsistent: boolean;
  signedInitialNoteCount: number;
  signedInitialNoteAuthorEmployeeId: string | null;
  actorEmployeeId: string;
  openNursingTaskCount: number;
  draftPrescriptionCount: number;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: string } {
  if (!input.doctorActive || !input.doctorHasRole) return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  if (!input.doctorProfileId) return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  if (!input.encounterExists || input.encounterDoctorId !== input.doctorProfileId) return { kind: "REJECT", code: "ENCOUNTER_NOT_FOUND" };
  if (input.encounterStatus !== "IN_PROGRESS" || input.completedAtExists) return { kind: "REJECT", code: "ENCOUNTER_NOT_COMPLETABLE" };
  if (!input.encounterSourceConsistent) return { kind: "REJECT", code: "ENCOUNTER_SOURCE_INCONSISTENT" };
  if (input.signedInitialNoteCount !== 1 || input.signedInitialNoteAuthorEmployeeId !== input.actorEmployeeId) {
    return { kind: "REJECT", code: "SIGNED_INITIAL_NOTE_REQUIRED" };
  }
  if (input.openNursingTaskCount > 0) return { kind: "REJECT", code: "NURSING_TASKS_PENDING" };
  if (input.draftPrescriptionCount > 0) return { kind: "REJECT", code: "DRAFT_PRESCRIPTIONS_PENDING" };
  return { kind: "ALLOW" };
}
