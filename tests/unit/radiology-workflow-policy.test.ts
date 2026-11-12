import { describe, expect, it } from "vitest";
import { decideRadiologyReadiness, decideRadiologyScheduling, requiresRadiologistPregnancyReview } from "../../src/server/radiology/radiology-workflow-policy";

const validSchedule = {
  itemStatus: "PENDING",
  orderStatus: "ORDERED",
  resourceActive: true,
  resourceModality: "DIGITAL_XRAY",
  procedureModality: "DIGITAL_XRAY" as const,
  durationMinutes: 20,
  startsInFuture: true,
  workflowStarted: false,
  preOrderPregnancyAssessment: "SCREENING_REQUIRED",
};

describe("radiology resource scheduling policy", () => {
  it("allows an eligible future exam on an active matching resource", () => {
    expect(decideRadiologyScheduling(validSchedule)).toEqual({ kind: "ALLOW" });
  });
  it("rejects completed or cancelled items", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, itemStatus: "COMPLETED" })).toEqual({ kind: "REJECT", code: "RADIOLOGY_ORDER_NOT_SCHEDULABLE" });
  });
  it("rejects a cancelled parent order", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, orderStatus: "CANCELLED" }).kind).toBe("REJECT");
  });
  it("rejects an inactive resource", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, resourceActive: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_RESOURCE_NOT_AVAILABLE" });
  });
  it("rejects a modality mismatch with the exact policy code", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, resourceModality: "ULTRASOUND" })).toEqual({ kind: "REJECT", code: "RADIOLOGY_RESOURCE_MODALITY_MISMATCH" });
  });
  it("rejects missing and out-of-range procedure durations", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, durationMinutes: null })).toEqual({ kind: "REJECT", code: "RADIOLOGY_DURATION_NOT_CONFIGURED" });
    expect(decideRadiologyScheduling({ ...validSchedule, durationMinutes: 300 })).toEqual({ kind: "REJECT", code: "RADIOLOGY_DURATION_NOT_CONFIGURED" });
  });
  it("requires a future start time", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, startsInFuture: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_SCHEDULE_MUST_BE_FUTURE" });
  });
  it("locks rescheduling after identity or preparation workflow begins", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, workflowStarted: true })).toEqual({ kind: "REJECT", code: "RADIOLOGY_RESCHEDULE_LOCKED" });
  });
  it("requires the ordering Doctor's pregnancy assessment for X-ray", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, preOrderPregnancyAssessment: null })).toEqual({ kind: "REJECT", code: "RADIOLOGY_PRE_ORDER_PREGNANCY_ASSESSMENT_REQUIRED" });
  });
  it("does not require an X-ray pregnancy assessment for ultrasound", () => {
    expect(decideRadiologyScheduling({ ...validSchedule, procedureModality: "ULTRASOUND", resourceModality: "ULTRASOUND", preOrderPregnancyAssessment: null })).toEqual({ kind: "ALLOW" });
  });
});

describe("radiology readiness policy", () => {
  const ready = { examStatus: "SCHEDULED", itemStatus: "SCHEDULED", identityVerified: true, preparationStatus: "CONFIRMED", modality: "DIGITAL_XRAY" as const, pregnancyResult: "NEGATIVE" as const, radiologistDecision: null };
  it("allows start only when all required checks are complete", () => {
    expect(decideRadiologyReadiness(ready).canStart).toBe(true);
  });
  it("blocks start until identity is verified", () => {
    expect(decideRadiologyReadiness({ ...ready, identityVerified: false }).canStart).toBe(false);
  });
  it("blocks start until preparation is complete", () => {
    expect(decideRadiologyReadiness({ ...ready, preparationStatus: "PENDING" }).canStart).toBe(false);
  });
  it("blocks a positive X-ray screen until Radiologist authorization", () => {
    expect(decideRadiologyReadiness({ ...ready, pregnancyResult: "POSITIVE" }).canStart).toBe(false);
    expect(decideRadiologyReadiness({ ...ready, pregnancyResult: "POSITIVE", radiologistDecision: "AUTHORIZE_AFTER_REVIEW" }).canStart).toBe(true);
  });
  it("defers the exam when the Radiologist decision is DEFER_EXAM", () => {
    const decision = decideRadiologyReadiness({ ...ready, pregnancyResult: "DECLINED", radiologistDecision: "DEFER_EXAM" });
    expect(decision.deferred).toBe(true);
    expect(decision.canStart).toBe(false);
  });
  it("does not require pregnancy screening for ultrasound", () => {
    const decision = decideRadiologyReadiness({ ...ready, modality: "ULTRASOUND", pregnancyResult: null });
    expect(decision.pregnancyScreeningRequired).toBe(false);
    expect(decision.canStart).toBe(true);
  });
  it("requires Radiologist review for positive or declined screens only", () => {
    expect(requiresRadiologistPregnancyReview("POSITIVE")).toBe(true);
    expect(requiresRadiologistPregnancyReview("DECLINED")).toBe(true);
    expect(requiresRadiologistPregnancyReview("NEGATIVE")).toBe(false);
    expect(requiresRadiologistPregnancyReview("NOT_APPLICABLE")).toBe(false);
  });
});
