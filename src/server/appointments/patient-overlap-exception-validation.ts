import { z } from "zod";

/**
 * Bounded operational reasons for a Reception-authorized same-patient overlap.
 * Free-text reasons are deliberately excluded to avoid collecting medical or
 * other unnecessary personal details in an appointment audit record.
 */
export const PATIENT_APPOINTMENT_OVERLAP_REASON_CODES = [
  "CLINIC_DIRECTED_RESCHEDULE",
  "CLINICIAN_REQUESTED_FOLLOW_UP",
  "PATIENT_REQUESTED_EXCEPTION",
  "SAME_DAY_SERVICE_COORDINATION",
] as const;

export type PatientAppointmentOverlapReasonCode =
  (typeof PATIENT_APPOINTMENT_OVERLAP_REASON_CODES)[number];

export const patientAppointmentOverlapReasonSchema = z.enum(
  PATIENT_APPOINTMENT_OVERLAP_REASON_CODES,
);

export function isPatientAppointmentOverlapReasonCode(
  value: unknown,
): value is PatientAppointmentOverlapReasonCode {
  return patientAppointmentOverlapReasonSchema.safeParse(value).success;
}
