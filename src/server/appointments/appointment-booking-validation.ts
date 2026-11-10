import { z } from "zod";

function isCanonicalUtcInstant(value: string): boolean {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

/**
 * The client must submit the exact UTC instant returned by the availability
 * endpoint. Local date/time strings and arbitrary offsets are not accepted.
 */
export const createPatientAppointmentSchema = z.object({
  patientId: z.string().trim().min(1).max(80),
  doctorId: z.string().trim().min(1).max(80),
  serviceId: z.string().trim().min(1).max(80),
  startsAt: z.string().refine(isCanonicalUtcInstant, "Choose an exact available appointment time."),
}).strict();

export type CreatePatientAppointmentInput = z.infer<typeof createPatientAppointmentSchema>;
