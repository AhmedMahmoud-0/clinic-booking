export const GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface GuestSelfReschedulingPolicyInput {
  source: string;
  patientId: string | null;
  status: string;
  currentStartsAt: Date;
  requestedStartsAt: Date;
  cancelledAt: Date | null;
  resolutionStatus: string;
  resolvedPatientId: string | null;
  now: Date;
}

/**
 * Guest-token rescheduling is limited to an unresolved public guest booking.
 * The 24-hour boundary is inclusive and measured in elapsed UTC milliseconds.
 * The replacement must be a different future instant; schedule/resource
 * availability is checked separately inside the booking transaction.
 */
export function isGuestSelfServiceReschedulingAllowed(
  input: GuestSelfReschedulingPolicyInput,
): boolean {
  if (input.source !== "PUBLIC_WEBSITE") return false;
  if (input.patientId !== null) return false;
  if (input.status !== "CONFIRMED" || input.cancelledAt !== null) return false;
  if (input.resolutionStatus !== "PENDING_VERIFICATION") return false;
  if (input.resolvedPatientId !== null) return false;

  const currentStart = input.currentStartsAt.getTime();
  const requestedStart = input.requestedStartsAt.getTime();
  const now = input.now.getTime();

  if (![currentStart, requestedStart, now].every(Number.isFinite)) return false;
  if (currentStart - now < GUEST_SELF_SERVICE_RESCHEDULING_WINDOW_MS) return false;
  if (requestedStart <= now || requestedStart === currentStart) return false;

  return true;
}
