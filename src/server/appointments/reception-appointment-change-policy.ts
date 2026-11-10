export const RECEPTION_APPOINTMENT_CHANGE_REASON_CODES = [
  "PATIENT_REQUESTED",
  "DOCTOR_UNAVAILABLE",
  "CLINIC_OPERATIONAL",
  "DUPLICATE_BOOKING",
] as const;

export type ReceptionAppointmentChangeReasonCode =
  (typeof RECEPTION_APPOINTMENT_CHANGE_REASON_CODES)[number];

export const RECEPTION_LATE_CHANGE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReceptionAppointmentChangeWindow = "STANDARD" | "LATE";

export function isReceptionAppointmentActor(input: {
  employeeStatus: string;
  activeRoles: readonly string[];
}): boolean {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("RECEPTION");
}

export interface ReceptionAppointmentChangePolicyInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  source: string;
  patientId: string | null;
  patientIsActive: boolean;
  status: string;
  startsAt: Date;
  cancelledAt: Date | null;
  guestContactExists: boolean;
  guestResolutionStatus: string | null;
  guestResolvedPatientId: string | null;
  now: Date;
}

/**
 * Reception may manage only an upcoming, confirmed appointment and only while
 * holding an active RECEPTION assignment. Guest/public identity state must
 * remain consistent with the linked Patient (or pending guest) invariant.
 */
export function isReceptionAppointmentChangeAllowed(
  input: ReceptionAppointmentChangePolicyInput,
): boolean {
  if (!isReceptionAppointmentActor({
    employeeStatus: input.employeeStatus,
    activeRoles: input.activeRoles,
  })) return false;

  if (input.status !== "CONFIRMED" || input.cancelledAt !== null) return false;
  if (!Number.isFinite(input.startsAt.getTime()) || !Number.isFinite(input.now.getTime())) return false;
  if (input.startsAt.getTime() <= input.now.getTime()) return false;

  if (input.source === "PUBLIC_WEBSITE") {
    if (!input.guestContactExists) return false;
    if (input.patientId === null) {
      return input.guestResolutionStatus === "PENDING_VERIFICATION" &&
        input.guestResolvedPatientId === null;
    }
    return input.patientIsActive &&
      input.guestResolutionStatus === "LINKED" &&
      input.guestResolvedPatientId === input.patientId;
  }

  return input.source === "PATIENT_PORTAL" || input.source === "RECEPTION"
    ? input.patientId !== null && input.patientIsActive && !input.guestContactExists
    : false;
}

/** Classifies whether a Reception action is overriding the 24-hour self-service window. */
export function getReceptionAppointmentChangeWindow(
  startsAt: Date,
  now: Date,
): ReceptionAppointmentChangeWindow | null {
  const start = startsAt.getTime();
  const current = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current) || start <= current) return null;
  return start - current < RECEPTION_LATE_CHANGE_WINDOW_MS ? "LATE" : "STANDARD";
}
