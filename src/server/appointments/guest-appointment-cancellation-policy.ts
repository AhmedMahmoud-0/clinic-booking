export const GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const GUEST_REQUESTED_CANCELLATION_REASON =
  "GUEST_REQUESTED_CANCELLATION" as const;

export interface GuestSelfCancellationPolicyInput {
  source: string;
  patientId: string | null;
  status: string;
  startsAt: Date;
  cancelledAt: Date | null;
  resolutionStatus: string;
  resolvedPatientId: string | null;
  now: Date;
}

/**
 * Guest-token cancellation is limited to an unresolved public guest booking.
 * The exact 24-hour boundary is inclusive and uses elapsed UTC milliseconds.
 */
export function isGuestSelfServiceCancellationAllowed(
  input: GuestSelfCancellationPolicyInput,
): boolean {
  if (input.source !== "PUBLIC_WEBSITE") return false;
  if (input.patientId !== null) return false;
  if (input.status !== "CONFIRMED" || input.cancelledAt !== null) return false;
  if (input.resolutionStatus !== "PENDING_VERIFICATION") return false;
  if (input.resolvedPatientId !== null) return false;

  const startsAt = input.startsAt.getTime();
  const now = input.now.getTime();
  if (!Number.isFinite(startsAt) || !Number.isFinite(now)) return false;

  return startsAt - now >= GUEST_SELF_SERVICE_CANCELLATION_WINDOW_MS;
}
