export const WALK_IN_ACTIVE_QUEUE_STATUSES = ["WAITING", "CALLED", "IN_SERVICE"] as const;

export interface WalkInRegistrationEligibilityInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  patientIsActive: boolean;
  doctorIsActive: boolean;
  clinicIsOpen: boolean;
  doctorIsScheduled: boolean;
  doctorHasOngoingAppointment: boolean;
  doctorHasInServiceTicket: boolean;
  patientHasBlockingAppointment: boolean;
  patientHasActiveQueueEntry: boolean;
}

export type WalkInRegistrationDecision =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | "RECEPTION_PERMISSION_REQUIRED"
        | "ACTIVE_PATIENT_REQUIRED"
        | "ACTIVE_DOCTOR_REQUIRED"
        | "CLINIC_CLOSED"
        | "DOCTOR_NOT_SCHEDULED"
        | "DOCTOR_BUSY"
        | "PATIENT_HAS_APPOINTMENT"
        | "PATIENT_ALREADY_QUEUED";
    };

export function isWalkInReceptionActor(input: {
  employeeStatus: string;
  activeRoles: readonly string[];
}): boolean {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("RECEPTION");
}

/**
 * Walk-ins are accepted only for an existing active patient and an active
 * doctor whose clinic and doctor schedules are both open at the instant of
 * registration. Existing appointments and active queue/service states are
 * never displaced by creating a new ticket.
 */
export function decideWalkInRegistration(
  input: WalkInRegistrationEligibilityInput,
): WalkInRegistrationDecision {
  if (!isWalkInReceptionActor({ employeeStatus: input.employeeStatus, activeRoles: input.activeRoles })) {
    return { allowed: false, code: "RECEPTION_PERMISSION_REQUIRED" };
  }
  if (!input.patientIsActive) return { allowed: false, code: "ACTIVE_PATIENT_REQUIRED" };
  if (!input.doctorIsActive) return { allowed: false, code: "ACTIVE_DOCTOR_REQUIRED" };
  if (!input.clinicIsOpen) return { allowed: false, code: "CLINIC_CLOSED" };
  if (!input.doctorIsScheduled) return { allowed: false, code: "DOCTOR_NOT_SCHEDULED" };
  if (input.doctorHasOngoingAppointment || input.doctorHasInServiceTicket) {
    return { allowed: false, code: "DOCTOR_BUSY" };
  }
  if (input.patientHasBlockingAppointment) return { allowed: false, code: "PATIENT_HAS_APPOINTMENT" };
  if (input.patientHasActiveQueueEntry) return { allowed: false, code: "PATIENT_ALREADY_QUEUED" };
  return { allowed: true };
}

export type QueueCallNextDecision =
  | { kind: "RETURN_CURRENT_APPOINTMENT_CALL"; queueEntryId: string }
  | { kind: "RETURN_CURRENT_WALK_IN_CALL"; queueEntryId: string }
  | { kind: "DEFER_CURRENT_WALK_IN"; queueEntryId: string }
  | { kind: "CALL_APPOINTMENT"; queueEntryId: string }
  | { kind: "CALL_WALK_IN"; queueEntryId: string }
  | { kind: "SCHEDULED_APPOINTMENTS_PENDING" }
  | { kind: "QUEUE_EMPTY" }
  | { kind: "BLOCK_INACTIVE_PATIENT"; queueEntryId: string };

/**
 * Appointment tickets always outrank walk-ins. A future/current confirmed
 * appointment that has not ended also holds walk-ins until the booked visit
 * is checked in or its scheduled window passes. A previously called walk-in
 * is returned to WAITING when a scheduled appointment takes priority.
 */
export function decideQueueCallNext(input: {
  currentCalledEntry: { id: string; type: string } | null;
  nextWaitingAppointment: { id: string; patientIsActive: boolean } | null;
  nextWaitingWalkIn: { id: string; patientIsActive: boolean } | null;
  hasUnfinishedConfirmedAppointment: boolean;
}): QueueCallNextDecision {
  if (input.currentCalledEntry?.type === "APPOINTMENT") {
    return { kind: "RETURN_CURRENT_APPOINTMENT_CALL", queueEntryId: input.currentCalledEntry.id };
  }

  if (input.currentCalledEntry?.type === "WALK_IN") {
    if (input.nextWaitingAppointment || input.hasUnfinishedConfirmedAppointment) {
      return { kind: "DEFER_CURRENT_WALK_IN", queueEntryId: input.currentCalledEntry.id };
    }
    return { kind: "RETURN_CURRENT_WALK_IN_CALL", queueEntryId: input.currentCalledEntry.id };
  }

  if (input.nextWaitingAppointment) {
    return input.nextWaitingAppointment.patientIsActive
      ? { kind: "CALL_APPOINTMENT", queueEntryId: input.nextWaitingAppointment.id }
      : { kind: "BLOCK_INACTIVE_PATIENT", queueEntryId: input.nextWaitingAppointment.id };
  }

  if (input.hasUnfinishedConfirmedAppointment) {
    return { kind: "SCHEDULED_APPOINTMENTS_PENDING" };
  }

  if (input.nextWaitingWalkIn) {
    return input.nextWaitingWalkIn.patientIsActive
      ? { kind: "CALL_WALK_IN", queueEntryId: input.nextWaitingWalkIn.id }
      : { kind: "BLOCK_INACTIVE_PATIENT", queueEntryId: input.nextWaitingWalkIn.id };
  }

  return { kind: "QUEUE_EMPTY" };
}

export function summarizeReceptionQueue(statuses: readonly string[]) {
  return {
    waiting: statuses.filter((status) => status === "WAITING").length,
    called: statuses.filter((status) => status === "CALLED").length,
    inService: statuses.filter((status) => status === "IN_SERVICE").length,
    completed: statuses.filter((status) => status === "COMPLETED").length,
    left: statuses.filter((status) => status === "LEFT").length,
    cancelled: statuses.filter((status) => status === "CANCELLED").length,
  };
}

export function getQueueWaitingMinutes(input: { checkedInAt: Date; now: Date; status: string }): number | null {
  const checkedInAt = input.checkedInAt.getTime();
  const now = input.now.getTime();
  if (!Number.isFinite(checkedInAt) || !Number.isFinite(now)) return null;
  if (input.status !== "WAITING" && input.status !== "CALLED") return null;
  return Math.max(0, Math.floor((now - checkedInAt) / 60_000));
}
