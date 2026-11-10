import { z } from "zod";
import { patientAppointmentOverlapReasonSchema } from "./patient-overlap-exception-validation";

function isCanonicalUtcInstant(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

/**
 * Reception may create a booking only for an existing Patient record.
 * Patient identity is resolved by the staff workflow; the request never accepts
 * an employee identity claim, or free-text override reason. A bounded reason
 * code is accepted only for the dedicated Reception overlap-exception policy.
 */
export const createReceptionAppointmentSchema = z.object({
  patientId: z.string().trim().min(1).max(80),
  doctorId: z.string().trim().min(1).max(80),
  serviceId: z.string().trim().min(1).max(80),
  startsAt: z.string().refine(isCanonicalUtcInstant, "Choose an exact available appointment time."),
  patientOverlapReasonCode: patientAppointmentOverlapReasonSchema.optional(),
}).strict();

export type CreateReceptionAppointmentInput = z.infer<typeof createReceptionAppointmentSchema>;
