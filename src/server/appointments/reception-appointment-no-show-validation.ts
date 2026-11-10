import { z } from "zod";

/** Route identifiers are opaque server-side identifiers, never patient data. */
export const receptionAppointmentNoShowIdSchema = z.string().trim().min(1).max(80);

/** No-show reason and actor are determined by the server; the client sends no fields. */
export const receptionAppointmentNoShowRequestSchema = z.object({}).strict();

export type ReceptionAppointmentNoShowRequest = z.infer<
  typeof receptionAppointmentNoShowRequestSchema
>;
