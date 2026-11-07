import { z } from "zod";

const reasonSchema = z.string().trim().min(5).max(500);
const catalogCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "Use an uppercase catalog code with letters, numbers, underscores, or hyphens.");

const priceSchema = z
  .union([
    z.number().finite(),
    z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter an EGP amount with up to two decimal places."),
  ])
  .transform((value) => Number(value))
  .refine(
    (value) =>
      value > 0 &&
      value <= 99_999_999.99 &&
      Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "The price must be positive and fit the EGP two-decimal amount format.",
  );

const durationSchema = z.number().int().min(5).max(240).nullable();
const turnaroundSchema = z.number().int().min(1).max(20_160).nullable();
const textOrNull = (max: number) => z.string().trim().max(max).nullable();

function hasEditableField(value: Record<string, unknown>, excluded: string[] = ["reason"]): boolean {
  return Object.keys(value).some((key) => !excluded.includes(key));
}

export const createLabTestSchema = z
  .object({
    code: catalogCodeSchema,
    name: z.string().trim().min(2).max(180),
    description: textOrNull(4000).optional(),
    specimenType: textOrNull(100).optional(),
    defaultTurnaroundMinutes: turnaroundSchema.optional(),
    requiresFasting: z.boolean(),
    preparationInstructions: textOrNull(4000).optional(),
    price: priceSchema,
    reason: reasonSchema,
  })
  .strict();

export const labTestPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(180).optional(),
    description: textOrNull(4000).optional(),
    specimenType: textOrNull(100).optional(),
    defaultTurnaroundMinutes: turnaroundSchema.optional(),
    requiresFasting: z.boolean().optional(),
    preparationInstructions: textOrNull(4000).optional(),
    price: priceSchema.optional(),
    isActive: z.boolean().optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => hasEditableField(value), {
    message: "Provide at least one laboratory test field to update.",
  });

export const createLabTestComponentSchema = z
  .object({
    code: catalogCodeSchema,
    name: z.string().trim().min(2).max(160),
    valueType: z.enum(["NUMERIC", "TEXT", "BOOLEAN"]),
    defaultUnit: textOrNull(40).optional(),
    sortOrder: z.number().int().min(0).max(500).default(0),
    reason: reasonSchema,
  })
  .strict();

/** Component code and value type are intentionally immutable after creation. */
export const labTestComponentPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    defaultUnit: textOrNull(40).optional(),
    sortOrder: z.number().int().min(0).max(500).optional(),
    isActive: z.boolean().optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => hasEditableField(value), {
    message: "Provide at least one laboratory component field to update.",
  });

export const createRadiologyProcedureSchema = z
  .object({
    code: catalogCodeSchema,
    name: z.string().trim().min(2).max(180),
    modality: z.enum(["DIGITAL_XRAY", "ULTRASOUND"]),
    description: textOrNull(4000).optional(),
    defaultDurationMinutes: durationSchema.optional(),
    price: priceSchema,
    preparationInstructions: textOrNull(4000).optional(),
    reason: reasonSchema,
  })
  .strict();

/** Procedure code and modality are immutable; historical orders retain their price snapshots. */
export const radiologyProcedurePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(180).optional(),
    description: textOrNull(4000).optional(),
    defaultDurationMinutes: durationSchema.optional(),
    price: priceSchema.optional(),
    preparationInstructions: textOrNull(4000).optional(),
    isActive: z.boolean().optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => hasEditableField(value), {
    message: "Provide at least one radiology procedure field to update.",
  });

export const createRadiologyResourceSchema = z
  .object({
    code: catalogCodeSchema,
    name: z.string().trim().min(2).max(120),
    modality: z.enum(["DIGITAL_XRAY", "ULTRASOUND"]),
    location: textOrNull(120).optional(),
    reason: reasonSchema,
  })
  .strict();

/** A resource's modality is immutable to protect existing exam/resource compatibility. */
export const radiologyResourcePatchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    location: textOrNull(120).optional(),
    isActive: z.boolean().optional(),
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => hasEditableField(value), {
    message: "Provide at least one radiology resource field to update.",
  });

export type CreateLabTestInput = z.infer<typeof createLabTestSchema>;
export type LabTestPatchInput = z.infer<typeof labTestPatchSchema>;
export type CreateLabTestComponentInput = z.infer<typeof createLabTestComponentSchema>;
export type LabTestComponentPatchInput = z.infer<typeof labTestComponentPatchSchema>;
export type CreateRadiologyProcedureInput = z.infer<typeof createRadiologyProcedureSchema>;
export type RadiologyProcedurePatchInput = z.infer<typeof radiologyProcedurePatchSchema>;
export type CreateRadiologyResourceInput = z.infer<typeof createRadiologyResourceSchema>;
export type RadiologyResourcePatchInput = z.infer<typeof radiologyResourcePatchSchema>;
