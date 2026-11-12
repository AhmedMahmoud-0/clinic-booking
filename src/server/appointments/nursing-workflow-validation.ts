import { z } from "zod";

export const nursingTaskIdSchema = z.string().trim().min(1).max(80);
export const nursingEncounterIdSchema = z.string().trim().min(1).max(80);

export const createNursingTaskRequestSchema = z.object({
  assignedToEmployeeId: z.string().trim().min(1).max(80),
  taskType: z.enum([
    "RECORD_VITAL_SIGNS",
    "REPEAT_VITAL_SIGNS",
    "PRE_CONSULTATION_ASSESSMENT",
    "PROCEDURE_PREPARATION",
    "OTHER",
  ]),
  instructions: z.string().trim().max(2_000).nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict();

export const nurseTaskActionRequestSchema = z.object({
  action: z.enum(["START", "COMPLETE", "ESCALATE"]),
  escalationNote: z.string().trim().min(5).max(1_000).optional(),
}).strict().superRefine((value, context) => {
  if (value.action === "ESCALATE" && !value.escalationNote?.trim()) {
    context.addIssue({ code: "custom", path: ["escalationNote"], message: "An escalation note is required." });
  }
  if (value.action !== "ESCALATE" && value.escalationNote !== undefined) {
    context.addIssue({ code: "custom", path: ["escalationNote"], message: "An escalation note is accepted only for escalation." });
  }
});

export const resolveNursingTaskRequestSchema = z.object({
  action: z.enum(["RESUME", "CANCEL"]),
  note: z.string().trim().min(5).max(1_000),
}).strict();

const nullableNumber = (min: number, max: number) => z.number().finite().min(min).max(max).nullable().optional();

export const nurseVitalSignRequestSchema = z.object({
  temperatureC: nullableNumber(15, 50),
  systolicMmHg: z.number().int().min(1).max(400).nullable().optional(),
  diastolicMmHg: z.number().int().min(1).max(300).nullable().optional(),
  pulseBpm: z.number().int().min(1).max(300).nullable().optional(),
  respiratoryRatePerMin: z.number().int().min(1).max(100).nullable().optional(),
  oxygenSaturationPct: nullableNumber(0, 100),
  heightCm: nullableNumber(30, 250),
  weightKg: nullableNumber(0.1, 500),
  note: z.string().trim().max(500).nullable().optional(),
}).strict().superRefine((value, context) => {
  const hasSystolic = value.systolicMmHg !== undefined && value.systolicMmHg !== null;
  const hasDiastolic = value.diastolicMmHg !== undefined && value.diastolicMmHg !== null;
  if (hasSystolic !== hasDiastolic) {
    context.addIssue({ code: "custom", path: [hasSystolic ? "diastolicMmHg" : "systolicMmHg"], message: "Both blood-pressure values are required together." });
  }
  if (hasSystolic && hasDiastolic && value.systolicMmHg! <= value.diastolicMmHg!) {
    context.addIssue({ code: "custom", path: ["systolicMmHg"], message: "Systolic pressure must be greater than diastolic pressure." });
  }
  const measurements = [value.temperatureC, value.systolicMmHg, value.diastolicMmHg, value.pulseBpm, value.respiratoryRatePerMin, value.oxygenSaturationPct, value.heightCm, value.weightKg];
  if (!measurements.some((item) => item !== undefined && item !== null)) {
    context.addIssue({ code: "custom", message: "At least one measured vital-sign value is required." });
  }
  if (value.heightCm != null && value.weightKg != null) {
    const bmi = value.weightKg / ((value.heightCm / 100) ** 2);
    if (!Number.isFinite(bmi) || bmi > 999.99) {
      context.addIssue({ code: "custom", path: ["weightKg"], message: "The derived BMI would exceed the existing database field precision." });
    }
  }
});

export const completeDoctorEncounterRequestSchema = z.object({}).strict();

export type CreateNursingTaskRequest = z.infer<typeof createNursingTaskRequestSchema>;
export type NurseTaskActionRequest = z.infer<typeof nurseTaskActionRequestSchema>;
export type ResolveNursingTaskRequest = z.infer<typeof resolveNursingTaskRequestSchema>;
export type NurseVitalSignRequest = z.infer<typeof nurseVitalSignRequestSchema>;
