import { z } from "zod";

/** The patient may request only a new instant; identity, doctor, service, room, and price are server-owned. */
export const patientAppointmentReschedulingRequestSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
}).strict();

export const patientAppointmentReschedulingIdSchema = z.string().trim().min(1).max(80);

export type PatientAppointmentReschedulingRequest = z.infer<
  typeof patientAppointmentReschedulingRequestSchema
>;
