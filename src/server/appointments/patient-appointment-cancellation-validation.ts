import { z } from "zod";

/** The patient cannot supply an actor, reason, status, or appointment fields. */
export const patientAppointmentCancellationRequestSchema = z.object({}).strict();

export const patientAppointmentIdSchema = z.string().trim().min(1).max(80);

export type PatientAppointmentCancellationRequest = z.infer<
  typeof patientAppointmentCancellationRequestSchema
>;
