import { z } from "zod";

export const doctorPrescriptionEncounterIdSchema = z.string().trim().min(1).max(80);
export const doctorPrescriptionIdSchema = z.string().trim().min(1).max(80);

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

const positiveDecimalText = z.string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/, "Enter a positive amount with up to two decimal places.")
  .refine((value) => Number(value) > 0, "The amount must be greater than zero.");

const optionalPositiveDecimalText = positiveDecimalText.nullable().optional();

const prescriptionItemSchema = z.object({
  medicationName: z.string().trim().min(1).max(180),
  strength: optionalText(100),
  dosage: z.string().trim().min(1).max(180),
  route: optionalText(80),
  frequency: z.string().trim().min(1).max(180),
  durationDays: z.number().int().min(1).max(3_650).nullable().optional(),
  quantity: optionalPositiveDecimalText,
  quantityUnit: optionalText(40),
  isPrn: z.boolean().default(false),
  prnMaxQuantityPerDose: optionalPositiveDecimalText,
  prnMaxDoseUnit: optionalText(40),
  prnMaxDosesPerDay: z.number().int().min(1).max(2_147_483_647).nullable().optional(),
  refills: z.number().int().min(0).max(20).default(0),
  instructions: optionalText(1_000),
}).strict().superRefine((item, context) => {
  const prnValues = [item.prnMaxQuantityPerDose, item.prnMaxDoseUnit, item.prnMaxDosesPerDay];
  if (item.isPrn) {
    if (!item.prnMaxQuantityPerDose) {
      context.addIssue({ code: "custom", path: ["prnMaxQuantityPerDose"], message: "A maximum amount per PRN dose is required." });
    }
    if (!item.prnMaxDoseUnit?.trim()) {
      context.addIssue({ code: "custom", path: ["prnMaxDoseUnit"], message: "A unit for the PRN maximum dose is required." });
    }
    if (item.prnMaxDosesPerDay === null || item.prnMaxDosesPerDay === undefined) {
      context.addIssue({ code: "custom", path: ["prnMaxDosesPerDay"], message: "The maximum number of PRN doses per day is required." });
    }
  } else if (prnValues.some((value) => value !== undefined && value !== null && value !== "")) {
    context.addIssue({ code: "custom", path: ["isPrn"], message: "PRN maximum-dose fields are allowed only when isPrn is true." });
  }
  if (item.quantity && !item.quantityUnit?.trim()) {
    context.addIssue({ code: "custom", path: ["quantityUnit"], message: "A unit is required when a dispense quantity is supplied." });
  }
});

export const doctorPrescriptionDraftRequestSchema = z.object({
  generalInstructions: optionalText(4_000),
  items: z.array(prescriptionItemSchema).min(1).max(20),
}).strict();

export type DoctorPrescriptionDraftRequest = z.infer<typeof doctorPrescriptionDraftRequestSchema>;
export type DoctorPrescriptionDraftItem = DoctorPrescriptionDraftRequest["items"][number];
