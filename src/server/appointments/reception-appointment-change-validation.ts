import { z } from "zod";
import { RECEPTION_APPOINTMENT_CHANGE_REASON_CODES } from "./reception-appointment-change-policy";

const reasonCodeSchema = z.enum(RECEPTION_APPOINTMENT_CHANGE_REASON_CODES);

export const receptionAppointmentChangeIdSchema = z.string().trim().min(1).max(80);

export const receptionAppointmentCancellationRequestSchema = z.object({
  reasonCode: reasonCodeSchema,
}).strict();

export const receptionAppointmentReschedulingRequestSchema = z.object({
  reasonCode: reasonCodeSchema,
  startsAt: z.string().datetime({ offset: true }),
}).strict();

export type ReceptionAppointmentCancellationRequest = z.infer<
  typeof receptionAppointmentCancellationRequestSchema
>;
export type ReceptionAppointmentReschedulingRequest = z.infer<
  typeof receptionAppointmentReschedulingRequestSchema
>;
