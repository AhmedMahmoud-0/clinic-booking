import { describe, expect, it } from "vitest";
import { createNursingTaskRequestSchema, nurseTaskActionRequestSchema, nurseVitalSignRequestSchema, resolveNursingTaskRequestSchema, completeDoctorEncounterRequestSchema } from "../../src/server/appointments/nursing-workflow-validation";

describe("Nursing task request validation", () => {
  it("accepts a supported Doctor-assigned task", () => expect(createNursingTaskRequestSchema.safeParse({ assignedToEmployeeId: "nurse-1", taskType: "RECORD_VITAL_SIGNS" }).success).toBe(true));
  it("accepts optional instructions and an offset-aware due time", () => expect(createNursingTaskRequestSchema.safeParse({ assignedToEmployeeId: "nurse-1", taskType: "OTHER", instructions: "Prepare the patient.", dueAt: "2026-11-10T10:00:00+02:00" }).success).toBe(true));
  it("rejects client-supplied Encounter, Doctor, status, or actor fields", () => expect(createNursingTaskRequestSchema.safeParse({ assignedToEmployeeId: "nurse-1", taskType: "OTHER", encounterId: "forged", status: "COMPLETED", createdByEmployeeId: "forged" }).success).toBe(false));
  it("rejects unsupported task types and blank assigned IDs", () => {
    expect(createNursingTaskRequestSchema.safeParse({ assignedToEmployeeId: " ", taskType: "OTHER" }).success).toBe(false);
    expect(createNursingTaskRequestSchema.safeParse({ assignedToEmployeeId: "nurse-1", taskType: "DIAGNOSE" }).success).toBe(false);
  });
});

describe("Nurse task action validation", () => {
  it("accepts START and COMPLETE actions", () => {
    expect(nurseTaskActionRequestSchema.safeParse({ action: "START" }).success).toBe(true);
    expect(nurseTaskActionRequestSchema.safeParse({ action: "COMPLETE" }).success).toBe(true);
  });
  it("requires an escalation note for ESCALATE", () => expect(nurseTaskActionRequestSchema.safeParse({ action: "ESCALATE" }).success).toBe(false));
  it("rejects an escalation note for a non-escalation action", () => expect(nurseTaskActionRequestSchema.safeParse({ action: "START", escalationNote: "Concern" }).success).toBe(false));
  it("rejects caller-selected task state or identity fields", () => expect(nurseTaskActionRequestSchema.safeParse({ action: "COMPLETE", status: "COMPLETED", actorEmployeeId: "forged" }).success).toBe(false));
});

describe("Nurse vital-sign validation", () => {
  it("accepts a set of valid measurements without caller-selected BMI or timestamp", () => expect(nurseVitalSignRequestSchema.safeParse({ systolicMmHg: 120, diastolicMmHg: 80, pulseBpm: 72, temperatureC: 36.7, heightCm: 170, weightKg: 65 }).success).toBe(true));
  it("accepts one measured field, including a concerning value that must remain recordable", () => {
    expect(nurseVitalSignRequestSchema.safeParse({ pulseBpm: 70 }).success).toBe(true);
    expect(nurseVitalSignRequestSchema.safeParse({ oxygenSaturationPct: 28 }).success).toBe(true);
    expect(nurseVitalSignRequestSchema.safeParse({ temperatureC: 18.2 }).success).toBe(true);
  });
  it("requires at least one measurement", () => expect(nurseVitalSignRequestSchema.safeParse({ note: "Patient reports feeling well." }).success).toBe(false));
  it("requires both blood-pressure values together", () => expect(nurseVitalSignRequestSchema.safeParse({ systolicMmHg: 120 }).success).toBe(false));
  it("requires systolic pressure to exceed diastolic pressure", () => expect(nurseVitalSignRequestSchema.safeParse({ systolicMmHg: 70, diastolicMmHg: 90 }).success).toBe(false));
  it("rejects out-of-range readings and forged metadata", () => {
    expect(nurseVitalSignRequestSchema.safeParse({ oxygenSaturationPct: 150 }).success).toBe(false);
    expect(nurseVitalSignRequestSchema.safeParse({ heightCm: 30, weightKg: 500 }).success).toBe(false);
    expect(nurseVitalSignRequestSchema.safeParse({ pulseBpm: 70, bmi: 20, measuredAt: "2026-11-10T10:00:00Z" }).success).toBe(false);
  });
});

describe("Doctor task resolution and Encounter completion validation", () => {
  it("accepts a bounded Doctor resolution reason", () => expect(resolveNursingTaskRequestSchema.safeParse({ action: "RESUME", note: "Reviewed and can continue." }).success).toBe(true));
  it("rejects missing reasons and forged actor fields", () => expect(resolveNursingTaskRequestSchema.safeParse({ action: "CANCEL", note: "stop", actorEmployeeId: "forged" }).success).toBe(false));
  it("accepts only an empty Encounter completion body", () => {
    expect(completeDoctorEncounterRequestSchema.safeParse({}).success).toBe(true);
    expect(completeDoctorEncounterRequestSchema.safeParse({ status: "COMPLETED", completedAt: "2026-11-10T10:00:00Z" }).success).toBe(false);
  });
});
