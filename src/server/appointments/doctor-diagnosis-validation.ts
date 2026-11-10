import { z } from "zod";

export const doctorDiagnosisEncounterIdSchema = z.string().trim().min(1).max(80);
export const doctorEncounterDiagnosisIdSchema = z.string().trim().min(1).max(80);
export const doctorDiagnosisCatalogQuerySchema = z.string().trim().max(80).optional();

export const doctorDiagnosisAddRequestSchema = z.object({
  diagnosisId: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(1_000).nullable().optional(),
  isPrimary: z.boolean().optional().default(false),
}).strict();

export const doctorDiagnosisPrimaryRequestSchema = z.object({}).strict();

export type DoctorDiagnosisAddRequest = z.infer<typeof doctorDiagnosisAddRequestSchema>;
