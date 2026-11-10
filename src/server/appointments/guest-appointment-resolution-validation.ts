import { z } from "zod";
import { patientIdentityVerificationSchema } from "../patient-management/identity-verification-validation";
import { patientAppointmentOverlapReasonSchema } from "./patient-overlap-exception-validation";

/**
 * Reception resolves a public guest appointment only after selecting an
 * existing Patient and comparing two distinct identifiers against that
 * Patient's stored record. Guest-contact details are deliberately not used
 * as identity evidence.
 */
export const resolveGuestAppointmentSchema = z.object({
  patientId: z.string().trim().min(1).max(80),
  identity: patientIdentityVerificationSchema,
  patientOverlapReasonCode: patientAppointmentOverlapReasonSchema.optional(),
}).strict();

export type ResolveGuestAppointmentInput = z.infer<typeof resolveGuestAppointmentSchema>;
