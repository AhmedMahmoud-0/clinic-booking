import { z } from "zod";

/** Issuance has no caller-controlled fields; the empty object is intentional. */
export const doctorPrescriptionIssueRequestSchema = z.object({}).strict();
