import { z } from "zod";

export const doctorLabEncounterIdSchema = z.string().trim().min(1).max(80);

export const doctorLabCatalogQuerySchema = z.string().trim().max(80).optional();

export const doctorLabOrderRequestSchema = z.object({
  labTestIds: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  priority: z.enum(["ROUTINE", "URGENT"]).default("ROUTINE"),
  clinicalNotes: z.string().trim().max(1_000).nullable().optional(),
}).strict().superRefine((input, context) => {
  if (new Set(input.labTestIds).size !== input.labTestIds.length) {
    context.addIssue({
      code: "custom",
      path: ["labTestIds"],
      message: "A laboratory test can appear only once in one order.",
    });
  }
});

export type DoctorLabOrderRequest = z.infer<typeof doctorLabOrderRequestSchema>;
