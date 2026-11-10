import { z } from "zod";
import { doctorClinicalNoteEncounterIdSchema } from "./doctor-clinical-note-validation";

/** Signing has no caller-controlled fields; the empty object is intentional. */
export const doctorClinicalNoteSignRequestSchema = z.object({}).strict();
export { doctorClinicalNoteEncounterIdSchema };
