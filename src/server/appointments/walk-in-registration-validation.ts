import { z } from "zod";
import { patientIdentityVerificationSchema } from "../patient-management/identity-verification-validation";

const entityIdSchema = z.string().trim().min(1).max(80);

export const receptionWalkInRegistrationRequestSchema = z.object({
  patientId: entityIdSchema,
  doctorId: entityIdSchema,
  identity: patientIdentityVerificationSchema,
}).strict();

export type ReceptionWalkInRegistrationRequest = z.infer<typeof receptionWalkInRegistrationRequestSchema>;
