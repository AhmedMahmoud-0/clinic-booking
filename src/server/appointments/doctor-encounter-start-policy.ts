export type DoctorEncounterStartQueueStatus =
  | "WAITING"
  | "CALLED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "LEFT"
  | "CANCELLED";

export type DoctorEncounterStartDecision =
  | { kind: "START" }
  | { kind: "ALREADY_STARTED" }
  | {
      kind: "REJECT";
      code:
        | "DOCTOR_WORKSPACE_ACCESS_REQUIRED"
        | "DOCTOR_PROFILE_REQUIRED"
        | "QUEUE_ENTRY_NOT_FOUND"
        | "QUEUE_ENTRY_NOT_TODAY"
        | "PATIENT_NOT_ACTIVE"
        | "QUEUE_ENTRY_SOURCE_INCONSISTENT"
        | "APPOINTMENT_NOT_READY_FOR_CONSULTATION"
        | "QUEUE_ENTRY_NOT_CALLED"
        | "ENCOUNTER_ALREADY_EXISTS"
        | "DOCTOR_ALREADY_HAS_ACTIVE_CONSULTATION";
    };

export interface DoctorEncounterStartPolicyInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  doctorProfileLinked: boolean;
  queueEntryExists: boolean;
  queueDateIsToday: boolean;
  queueStatus: DoctorEncounterStartQueueStatus;
  queueType: string;
  queueAppointmentId: string | null;
  queueCalledAtExists: boolean;
  patientIsActive: boolean;
  appointmentExists: boolean;
  appointmentId: string | null;
  appointmentPatientMatches: boolean;
  appointmentDoctorMatches: boolean;
  appointmentStatus: string | null;
  appointmentStateIsReady: boolean;
  serviceStartedAtExists: boolean;
  encounterOriginIsConsistent: boolean;
  existingEncounterId: string | null;
  existingEncounterStatus: string | null;
  doctorHasOtherInServiceEntry: boolean;
}

/**
 * Keep the Doctor start transition fail-closed and deterministic. Database
 * ownership, row locks, and the atomic state changes are enforced by the
 * transaction service; this function captures the business decision only.
 */
export function decideDoctorEncounterStart(
  input: DoctorEncounterStartPolicyInput,
): DoctorEncounterStartDecision {
  if (input.employeeStatus !== "ACTIVE" || !input.activeRoles.includes("DOCTOR")) {
    return { kind: "REJECT", code: "DOCTOR_WORKSPACE_ACCESS_REQUIRED" };
  }
  if (!input.doctorProfileLinked) {
    return { kind: "REJECT", code: "DOCTOR_PROFILE_REQUIRED" };
  }
  if (!input.queueEntryExists) {
    return { kind: "REJECT", code: "QUEUE_ENTRY_NOT_FOUND" };
  }
  if (!input.queueDateIsToday) {
    return { kind: "REJECT", code: "QUEUE_ENTRY_NOT_TODAY" };
  }
  if (!input.patientIsActive) {
    return { kind: "REJECT", code: "PATIENT_NOT_ACTIVE" };
  }

  const isAppointmentEntry = input.queueType === "APPOINTMENT";
  const isWalkInEntry = input.queueType === "WALK_IN";
  if (!isAppointmentEntry && !isWalkInEntry) {
    return { kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT" };
  }

  if (isAppointmentEntry) {
    if (
      !input.queueAppointmentId
      || !input.appointmentExists
      || input.appointmentId !== input.queueAppointmentId
      || !input.appointmentPatientMatches
      || !input.appointmentDoctorMatches
    ) {
      return { kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT" };
    }
  } else if (input.queueAppointmentId !== null || input.appointmentExists || input.appointmentId !== null) {
    return { kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT" };
  }

  if (!input.encounterOriginIsConsistent) {
    return { kind: "REJECT", code: "QUEUE_ENTRY_SOURCE_INCONSISTENT" };
  }

  if (input.doctorHasOtherInServiceEntry) {
    return { kind: "REJECT", code: "DOCTOR_ALREADY_HAS_ACTIVE_CONSULTATION" };
  }

  const appointmentIsInConsultation = isAppointmentEntry
    ? input.appointmentStatus === "IN_CONSULTATION"
    : input.appointmentStatus === null;
  if (
    input.queueStatus === "IN_SERVICE"
    && input.serviceStartedAtExists
    && input.existingEncounterId !== null
    && input.existingEncounterStatus === "IN_PROGRESS"
    && appointmentIsInConsultation
  ) {
    return { kind: "ALREADY_STARTED" };
  }

  if (input.queueStatus !== "CALLED" || !input.queueCalledAtExists || input.serviceStartedAtExists) {
    return { kind: "REJECT", code: "QUEUE_ENTRY_NOT_CALLED" };
  }
  if (input.existingEncounterId !== null) {
    return { kind: "REJECT", code: "ENCOUNTER_ALREADY_EXISTS" };
  }
  if (isAppointmentEntry && (input.appointmentStatus !== "CHECKED_IN" || !input.appointmentStateIsReady)) {
    return { kind: "REJECT", code: "APPOINTMENT_NOT_READY_FOR_CONSULTATION" };
  }
  return { kind: "START" };
}
