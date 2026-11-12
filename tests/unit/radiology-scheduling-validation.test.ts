import { describe, expect, it } from "vitest";
import {
  radiologyIdentityVerificationRequestSchema,
  radiologyPregnancyReviewRequestSchema,
  radiologyPregnancyScreeningRequestSchema,
  radiologyPreparationRequestSchema,
  radiologyScheduleRequestSchema,
} from "../../src/server/radiology/radiology-scheduling-validation";

const identity = {
  identityVerification: {
    firstIdentifier: { type: "FULL_NAME", value: "Mona Hassan" },
    secondIdentifier: { type: "MRN", value: "MRN-00821" },
  },
};

describe("radiology schedule validation", () => {
  it("accepts a resource and timezone-aware start time", () => {
    expect(radiologyScheduleRequestSchema.safeParse({ resourceId: "resource-1", scheduledStartsAt: "2026-12-01T09:00:00+02:00" }).success).toBe(true);
  });
  it("rejects a timestamp without an explicit offset", () => {
    expect(radiologyScheduleRequestSchema.safeParse({ resourceId: "resource-1", scheduledStartsAt: "2026-12-01T09:00:00" }).success).toBe(false);
  });
  it("rejects caller-selected schedule state and actor", () => {
    expect(radiologyScheduleRequestSchema.safeParse({ resourceId: "resource-1", scheduledStartsAt: "2026-12-01T09:00:00+02:00", status: "COMPLETED", scheduledByEmployeeId: "forged" }).success).toBe(false);
  });
});

describe("radiology identity and preparation validation", () => {
  it("accepts two distinct patient identity elements", () => {
    expect(radiologyIdentityVerificationRequestSchema.safeParse(identity).success).toBe(true);
  });
  it("rejects an additional caller-selected patient or verification actor", () => {
    expect(radiologyIdentityVerificationRequestSchema.safeParse({ ...identity, patientId: "forged", verifiedByEmployeeId: "forged" }).success).toBe(false);
  });
  it("accepts a completed preparation check", () => {
    expect(radiologyPreparationRequestSchema.safeParse({ status: "CONFIRMED" }).success).toBe(true);
  });
  it("requires a note when preparation is not required or has an issue", () => {
    expect(radiologyPreparationRequestSchema.safeParse({ status: "NOT_REQUIRED" }).success).toBe(false);
    expect(radiologyPreparationRequestSchema.safeParse({ status: "ISSUE_REPORTED" }).success).toBe(false);
    expect(radiologyPreparationRequestSchema.safeParse({ status: "ISSUE_REPORTED", notes: "Patient did not complete required preparation." }).success).toBe(true);
  });
  it("rejects actor and timestamp fields in preparation input", () => {
    expect(radiologyPreparationRequestSchema.safeParse({ status: "CONFIRMED", checkedByEmployeeId: "forged", checkedAt: "2026-12-01T00:00:00Z" }).success).toBe(false);
  });
});

describe("X-ray pregnancy screening and Radiologist review validation", () => {
  it("accepts a negative exam-day screen", () => {
    expect(radiologyPregnancyScreeningRequestSchema.safeParse({ result: "NEGATIVE" }).success).toBe(true);
  });
  it("requires an explanation for declined or not-applicable screening", () => {
    expect(radiologyPregnancyScreeningRequestSchema.safeParse({ result: "DECLINED" }).success).toBe(false);
    expect(radiologyPregnancyScreeningRequestSchema.safeParse({ result: "NOT_APPLICABLE" }).success).toBe(false);
    expect(radiologyPregnancyScreeningRequestSchema.safeParse({ result: "DECLINED", notes: "Patient declined to answer." }).success).toBe(true);
  });
  it("accepts a Radiologist decision only with review notes", () => {
    expect(radiologyPregnancyReviewRequestSchema.safeParse({ decision: "DEFER_EXAM", notes: "Defer pending clinical review." }).success).toBe(true);
    expect(radiologyPregnancyReviewRequestSchema.safeParse({ decision: "AUTHORIZE_AFTER_REVIEW", notes: "ok" }).success).toBe(false);
  });
  it("rejects caller-selected reviewer and decision timestamps", () => {
    expect(radiologyPregnancyReviewRequestSchema.safeParse({ decision: "AUTHORIZE_AFTER_REVIEW", notes: "Reviewed against the referral context.", reviewedByEmployeeId: "forged", reviewedAt: "2026-12-01T00:00:00Z" }).success).toBe(false);
  });
});
