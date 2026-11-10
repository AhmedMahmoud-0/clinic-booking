import { z } from "zod";
import { patientIdentityVerificationSchema } from "../patient-management/identity-verification-validation";

export const receptionAppointmentCheckInIdSchema = z.string().trim().min(1).max(80);

export const receptionAppointmentCheckInRequestSchema = z.object({
  identity: patientIdentityVerificationSchema,
  lateArrivalAccepted: z.boolean().optional(),
}).strict();

export type ReceptionAppointmentCheckInRequest = z.infer<
  typeof receptionAppointmentCheckInRequestSchema
>;
