export const PATIENT_SELF_SERVICE_RESCHEDULING_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface PatientSelfReschedulingPolicyInput {
  patientId: string | null;
  status: string;
  currentStartsAt: Date;
  requestedStartsAt: Date;
  now: Date;
}

/**
 * A patient-linked confirmed appointment can be moved by the portal only when
 * its existing start is at least 24 hours away. The selected replacement must
 * be a different future instant; availability and resource checks happen in
 * the transaction service.
 */
export function isPatientSelfReschedulingAllowed(
  input: PatientSelfReschedulingPolicyInput,
): boolean {
  if (input.patientId === null || input.patientId.trim().length === 0) return false;
  if (input.status !== "CONFIRMED") return false;

  const currentStart = input.currentStartsAt.getTime();
  const requestedStart = input.requestedStartsAt.getTime();
  const now = input.now.getTime();

  if (![currentStart, requestedStart, now].every(Number.isFinite)) return false;
  if (currentStart - now < PATIENT_SELF_SERVICE_RESCHEDULING_WINDOW_MS) return false;
  if (requestedStart <= now || requestedStart === currentStart) return false;

  return true;
}
