import { z } from "zod";

export const doctorClinicalNoteEncounterIdSchema = z.string().trim().min(1).max(80);

const optionalClinicalTextSchema = z.string().trim().max(10_000).nullable().optional();

/**
 * The client may provide clinical narrative only. Encounter ownership, author,
 * note type, note status, signature, timestamps, and patient identity are
 * resolved and controlled by the server.
 */
export const doctorClinicalNoteDraftRequestSchema = z.object({
  chiefComplaint: z.string().trim().min(1).max(2_000),
  historyOfPresentIllness: optionalClinicalTextSchema,
  clinicalExamination: optionalClinicalTextSchema,
  assessment: optionalClinicalTextSchema,
  treatmentPlan: optionalClinicalTextSchema,
}).strict();

export type DoctorClinicalNoteDraftRequest = z.infer<typeof doctorClinicalNoteDraftRequestSchema>;
