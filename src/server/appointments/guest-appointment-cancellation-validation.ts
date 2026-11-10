import { z } from "zod";

/**
 * The guest management token is a 32-byte base64url bearer secret. It is
 * accepted only in the JSON body, never in a path or query parameter.
 */
export const guestAppointmentCancellationRequestSchema = z.object({
  managementToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export type GuestAppointmentCancellationRequest = z.infer<
  typeof guestAppointmentCancellationRequestSchema
>;
