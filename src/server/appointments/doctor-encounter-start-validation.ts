import { z } from "zod";

export const doctorQueueEntryIdSchema = z.string().trim().min(1).max(80);

/** Starting a visit is a state transition only; clients cannot submit clinical or actor data. */
export const doctorEncounterStartRequestSchema = z.object({}).strict();
