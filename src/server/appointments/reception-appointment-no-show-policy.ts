export const RECEPTION_NO_SHOW_GRACE_PERIOD_MS = 10 * 60 * 1000;
export const RECEPTION_NO_SHOW_GRACE_PERIOD_MINUTES = 10;

export interface ReceptionNoShowEligibilityInput {
  employeeStatus: string;
  activeRoles: readonly string[];
  source: string;
  patientId: string | null;
  status: string;
  startsAt: Date;
  checkedInAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  queueEntryExists: boolean;
  guestContactExists: boolean;
  guestResolutionStatus: string | null;
  guestResolvedPatientId: string | null;
  now: Date;
}

export function isReceptionNoShowActor(input: {
  employeeStatus: string;
  activeRoles: readonly string[];
}): boolean {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("RECEPTION");
}

/**
 * No-show is an explicit Reception decision, never a scheduled/automatic
 * transition. Only an unarrived CONFIRMED appointment may be marked, and only
 * after the inclusive 10-minute grace period has fully elapsed.
 */
export function isReceptionAppointmentEligibleForNoShow(
  input: ReceptionNoShowEligibilityInput,
): boolean {
  if (!isReceptionNoShowActor({
    employeeStatus: input.employeeStatus,
    activeRoles: input.activeRoles,
  })) return false;

  if (input.status !== "CONFIRMED") return false;
  if (input.checkedInAt !== null || input.cancelledAt !== null || input.completedAt !== null) return false;
  if (input.queueEntryExists) return false;
  if (!Number.isFinite(input.startsAt.getTime()) || !Number.isFinite(input.now.getTime())) return false;
  if (input.now.getTime() - input.startsAt.getTime() <= RECEPTION_NO_SHOW_GRACE_PERIOD_MS) return false;

  if (input.source === "PUBLIC_WEBSITE") {
    if (!input.guestContactExists) return false;
    if (input.patientId === null) {
      return input.guestResolutionStatus === "PENDING_VERIFICATION" &&
        input.guestResolvedPatientId === null;
    }
    return input.guestResolutionStatus === "LINKED" &&
      input.guestResolvedPatientId === input.patientId;
  }

  return (input.source === "PATIENT_PORTAL" || input.source === "RECEPTION") &&
    input.patientId !== null &&
    !input.guestContactExists &&
    input.guestResolutionStatus === null &&
    input.guestResolvedPatientId === null;
}
