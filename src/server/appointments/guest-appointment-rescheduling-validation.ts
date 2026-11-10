import { z } from "zod";

/** The bearer token is accepted only in the strict JSON body, never in a URL. */
export const guestAppointmentReschedulingRequestSchema = z.object({
  managementToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  startsAt: z.string().datetime({ offset: true }),
}).strict();

export type GuestAppointmentReschedulingRequest = z.infer<
  typeof guestAppointmentReschedulingRequestSchema
>;
