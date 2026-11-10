import { z } from "zod";
import { doctorClinicalNoteEncounterIdSchema } from "./doctor-clinical-note-validation";

const optionalClinicalTextSchema = z.string().trim().max(10_000).nullable().optional();

const amendmentChangesSchema = z.object({
  chiefComplaint: z.string().trim().min(1).max(2_000).optional(),
  historyOfPresentIllness: optionalClinicalTextSchema,
  clinicalExamination: optionalClinicalTextSchema,
  assessment: optionalClinicalTextSchema,
  treatmentPlan: optionalClinicalTextSchema,
}).strict().refine(
  (changes) => Object.keys(changes).length > 0,
  "At least one clinical note field must be supplied.",
);

/**
 * Clients submit only the fields being corrected and a reason. Previous and
 * corrected snapshots, author identity, and timestamp are server-controlled.
 */
export const doctorClinicalNoteAmendmentRequestSchema = z.object({
  reason: z.string().trim().min(5).max(1_000),
  changes: amendmentChangesSchema,
}).strict();

export type DoctorClinicalNoteAmendmentRequest = z.infer<typeof doctorClinicalNoteAmendmentRequestSchema>;
export { doctorClinicalNoteEncounterIdSchema };
