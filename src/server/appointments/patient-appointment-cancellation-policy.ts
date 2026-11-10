export const PATIENT_SELF_SERVICE_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const PATIENT_REQUESTED_CANCELLATION_REASON =
  "PATIENT_REQUESTED_CANCELLATION" as const;

export interface PatientSelfCancellationPolicyInput {
  patientId: string | null;
  status: string;
  startsAt: Date;
  now: Date;
}

/**
 * Self-service cancellation is available only for a confirmed appointment
 * already linked to a Patient, and only at least 24 hours before its instant.
 * The comparison uses elapsed milliseconds, not server-local calendar time.
 */
export function isPatientSelfCancellationAllowed(
  input: PatientSelfCancellationPolicyInput,
): boolean {
  if (input.patientId === null || input.patientId.trim().length === 0) return false;
  if (input.status !== "CONFIRMED") return false;

  const startsAt = input.startsAt.getTime();
  const now = input.now.getTime();
  if (!Number.isFinite(startsAt) || !Number.isFinite(now)) return false;

  return startsAt - now >= PATIENT_SELF_SERVICE_CANCELLATION_WINDOW_MS;
}
