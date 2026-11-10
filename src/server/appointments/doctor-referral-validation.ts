import { z } from "zod";

export const doctorReferralEncounterIdSchema = z.string().trim().min(1).max(80);

const optionalTargetIdSchema = z.string().trim().min(1).max(80).nullable().optional();
const optionalExternalTextSchema = z.string().trim().min(1).max(180).nullable().optional();

export const doctorReferralRequestSchema = z.object({
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  referredToSpecialtyId: optionalTargetIdSchema,
  referredToDoctorId: optionalTargetIdSchema,
  externalFacilityName: optionalExternalTextSchema,
  externalContact: optionalExternalTextSchema,
  reason: z.string().trim().min(1).max(1_000),
  instructions: z.string().trim().max(4_000).nullable().optional(),
}).strict().superRefine((input, context) => {
  const hasSpecialty = Boolean(input.referredToSpecialtyId);
  const hasDoctor = Boolean(input.referredToDoctorId);
  const hasExternalFacility = Boolean(input.externalFacilityName);
  const hasExternalContact = Boolean(input.externalContact);

  if (input.type === "INTERNAL") {
    if (!hasSpecialty && !hasDoctor) {
      context.addIssue({
        code: "custom",
        path: ["referredToSpecialtyId"],
        message: "An internal referral must target a specialty, a doctor, or both.",
      });
    }
    if (hasExternalFacility || hasExternalContact) {
      context.addIssue({
        code: "custom",
        path: ["externalFacilityName"],
        message: "External facility details are not allowed on an internal referral.",
      });
    }
  } else {
    if (!hasExternalFacility) {
      context.addIssue({
        code: "custom",
        path: ["externalFacilityName"],
        message: "An external referral requires a facility name.",
      });
    }
    if (hasSpecialty || hasDoctor) {
      context.addIssue({
        code: "custom",
        path: ["referredToSpecialtyId"],
        message: "Internal doctor and specialty targets are not allowed on an external referral.",
      });
    }
  }
});

export type DoctorReferralRequest = z.infer<typeof doctorReferralRequestSchema>;
