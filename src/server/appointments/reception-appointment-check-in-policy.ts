export const RECEPTION_CHECK_IN_GRACE_PERIOD_MS = 10 * 60 * 1000;
export const RECEPTION_CHECK_IN_EARLY_TARGET_MS = 15 * 60 * 1000;

export type ReceptionArrivalClassification =
  | "EARLY"
  | "EARLY_WITHIN_TARGET"
  | "WITHIN_GRACE"
  | "LATE_ACCEPTED";

export type ReceptionArrivalDecision =
  | ReceptionArrivalClassification
  | "LATE_DECISION_REQUIRED"
  | "UNEXPECTED_LATE_ACCEPTANCE"
  | "INVALID_TIME";

export function isReceptionCheckInActor(input: {
  employeeStatus: string;
  activeRoles: readonly string[];
}): boolean {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("RECEPTION");
}

export interface ReceptionAppointmentCheckInEligibilityInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  source: string;
  patientId: string | null;
  patientIsActive: boolean;
  status: string;
  checkedInAt: Date | null;
  cancelledAt: Date | null;
  queueEntryExists: boolean;
  guestContactExists: boolean;
  guestResolutionStatus: string | null;
  guestResolvedPatientId: string | null;
  appointmentLocalDate: string;
  currentLocalDate: string;
}

/**
 * A Reception check-in requires an active Reception assignment, an active
 * Patient, a confirmed appointment for the current Cairo-local date, and a
 * consistent source/guest-link state. An unresolved guest is never queued.
 */
export function isReceptionAppointmentEligibleForCheckIn(
  input: ReceptionAppointmentCheckInEligibilityInput,
): boolean {
  if (!isReceptionCheckInActor({
    employeeStatus: input.employeeStatus,
    activeRoles: input.activeRoles,
  })) return false;

  if (!input.patientId || !input.patientIsActive) return false;
  if (input.status !== "CONFIRMED" || input.checkedInAt !== null || input.cancelledAt !== null || input.queueEntryExists) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.appointmentLocalDate)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.currentLocalDate)) return false;
  if (input.appointmentLocalDate !== input.currentLocalDate) return false;

  if (input.source === "PUBLIC_WEBSITE") {
    return input.guestContactExists &&
      input.guestResolutionStatus === "LINKED" &&
      input.guestResolvedPatientId === input.patientId;
  }

  return (input.source === "PATIENT_PORTAL" || input.source === "RECEPTION") &&
    !input.guestContactExists &&
    input.guestResolutionStatus === null &&
    input.guestResolvedPatientId === null;
}

/**
 * The 10-minute grace period is inclusive. After it, Reception must explicitly
 * accept the late arrival; the appointment is never auto-cancelled or marked
 * No-show by this policy.
 */
export function getReceptionArrivalDecision(input: {
  startsAt: Date;
  now: Date;
  lateArrivalAccepted: boolean;
}): ReceptionArrivalDecision {
  const startsAt = input.startsAt.getTime();
  const now = input.now.getTime();
  if (!Number.isFinite(startsAt) || !Number.isFinite(now)) return "INVALID_TIME";

  const elapsed = now - startsAt;
  if (elapsed > RECEPTION_CHECK_IN_GRACE_PERIOD_MS) {
    return input.lateArrivalAccepted ? "LATE_ACCEPTED" : "LATE_DECISION_REQUIRED";
  }

  if (input.lateArrivalAccepted) return "UNEXPECTED_LATE_ACCEPTANCE";
  if (elapsed < -RECEPTION_CHECK_IN_EARLY_TARGET_MS) return "EARLY";
  if (elapsed < 0) return "EARLY_WITHIN_TARGET";
  return "WITHIN_GRACE";
}
