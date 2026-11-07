import { z } from "zod";

const reasonSchema = z.string().trim().min(5).max(500);
const specialtyIdSchema = z.string().trim().min(1).max(128);
const serviceIdSchema = z.string().trim().min(1).max(128);
const doctorIdSchema = z.string().trim().min(1).max(128);

function hasEditableField(value: Record<string, unknown>, excluded: string[] = ["reason"]): boolean {
  return Object.keys(value).some((key) => !excluded.includes(key));
}

export const specialtyPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    sortOrder: z.number().int().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => hasEditableField(value), {
    message: "Provide at least one specialty field to update.",
  });

export const doctorProfilePatchSchema = z
  .object({
    professionalTitle: z.string().trim().min(2).max(120).nullable().optional(),
    publicDisplayName: z.string().trim().min(2).max(160).nullable().optional(),
    publicBio: z.string().trim().max(3000).nullable().optional(),
    yearsOfExperience: z.number().int().min(0).max(60).nullable().optional(),
    isBookable: z.boolean().optional(),
    isPubliclyVisible: z.boolean().optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => hasEditableField(value), {
    message: "Provide at least one doctor-profile field to update.",
  });

export const doctorSpecialtyReplaceSchema = z
  .object({
    doctorId: doctorIdSchema,
    specialtyIds: z
      .array(specialtyIdSchema)
      .min(1)
      .max(7)
      .refine((values) => new Set(values).size === values.length, {
        message: "A specialty may be assigned to a doctor only once.",
      }),
    primarySpecialtyId: specialtyIdSchema,
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => value.specialtyIds.includes(value.primarySpecialtyId), {
    message: "The primary specialty must be included in the assigned specialties.",
    path: ["primarySpecialtyId"],
  });

const serviceCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Z0-9][A-Z0-9_]*$/, "Use an uppercase service code with letters, numbers, and underscores.");

export const createServiceSchema = z
  .object({
    code: serviceCodeSchema,
    name: z.string().trim().min(2).max(140),
    type: z.enum(["CONSULTATION", "FOLLOW_UP", "OTHER"]),
    description: z.string().trim().max(2000).nullable().optional(),
    reason: reasonSchema,
  })
  .strict();

export const servicePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => hasEditableField(value), {
    message: "Provide at least one service field to update.",
  });

const priceSchema = z
  .union([
    z.number().finite(),
    z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter an EGP price with up to two decimal places."),
  ])
  .transform((value) => Number(value))
  .refine(
    (value) =>
      value > 0 &&
      value <= 99_999_999.99 &&
      Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "The price must be positive and fit the EGP two-decimal amount format.",
  );

export const doctorServiceUpsertSchema = z
  .object({
    doctorId: doctorIdSchema,
    serviceId: serviceIdSchema,
    durationMinutes: z.number().int().min(5).max(240),
    price: priceSchema,
    reason: reasonSchema,
  })
  .strict();

export type SpecialtyPatchInput = z.infer<typeof specialtyPatchSchema>;
export type DoctorProfilePatchInput = z.infer<typeof doctorProfilePatchSchema>;
export type DoctorSpecialtyReplaceInput = z.infer<typeof doctorSpecialtyReplaceSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type ServicePatchInput = z.infer<typeof servicePatchSchema>;
export type DoctorServiceUpsertInput = z.infer<typeof doctorServiceUpsertSchema>;
