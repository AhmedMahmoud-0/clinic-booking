import { z } from "zod";

export const doctorRadiologyEncounterIdSchema = z.string().trim().min(1).max(80);

export const doctorRadiologyCatalogQuerySchema = z.string().trim().max(80).optional();

const doctorXrayPregnancyAssessmentSchema = z.object({
  assessment: z.enum(["SCREENING_REQUIRED", "NOT_INDICATED"]),
  notes: z.string().trim().max(1_000).nullable().optional(),
}).strict().superRefine((assessment, context) => {
  if (assessment.assessment === "NOT_INDICATED" && !assessment.notes?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["notes"],
      message: "A reason is required when X-ray pregnancy screening is not indicated.",
    });
  }
});

export const doctorRadiologyOrderRequestSchema = z.object({
  procedureIds: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
  priority: z.enum(["ROUTINE", "URGENT"]).default("ROUTINE"),
  clinicalNotes: z.string().trim().max(1_000).nullable().optional(),
  xrayPregnancyAssessment: doctorXrayPregnancyAssessmentSchema.optional(),
}).strict().superRefine((input, context) => {
  if (new Set(input.procedureIds).size !== input.procedureIds.length) {
    context.addIssue({
      code: "custom",
      path: ["procedureIds"],
      message: "A radiology procedure can appear only once in one order.",
    });
  }
});

export type DoctorRadiologyOrderRequest = z.infer<typeof doctorRadiologyOrderRequestSchema>;
