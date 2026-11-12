import { describe, expect, it } from "vitest";
import {
  doctorLabClinicalReviewRequestSchema,
  labCriticalAcknowledgementRequestSchema,
  labCriticalCommunicationRequestSchema,
  labCriticalEscalationRequestSchema,
  labResultReviewRequestSchema,
  labResultSubmissionSchema,
} from "../../src/server/laboratory/lab-result-review-validation";

describe("lab result submission validation", () => {
  it("accepts only an empty object", () => { expect(labResultSubmissionSchema.safeParse({}).success).toBe(true); });
  it("rejects client-selected status", () => { expect(labResultSubmissionSchema.safeParse({ status: "PENDING_REVIEW" }).success).toBe(false); });
});

describe("lab result review validation", () => {
  it("accepts approval", () => { expect(labResultReviewRequestSchema.safeParse({ decision: "APPROVED" }).success).toBe(true); });
  it("accepts rejection with a comment", () => { expect(labResultReviewRequestSchema.safeParse({ decision: "REJECTED", comments: "Please verify units." }).success).toBe(true); });
  it("requires a comment for rejection", () => { expect(labResultReviewRequestSchema.safeParse({ decision: "REJECTED" }).success).toBe(false); });
  it("rejects caller-selected reviewer", () => { expect(labResultReviewRequestSchema.safeParse({ decision: "APPROVED", reviewerEmployeeId: "forged" }).success).toBe(false); });
});

describe("critical communication validation", () => {
  it("accepts a bounded phone notice", () => { expect(labCriticalCommunicationRequestSchema.safeParse({ method: "PHONE", communicatedToName: "Dr. Ahmed" }).success).toBe(true); });
  it("rejects blank recipient", () => { expect(labCriticalCommunicationRequestSchema.safeParse({ method: "PHONE", communicatedToName: " " }).success).toBe(false); });
  it("rejects caller-selected timestamps", () => { expect(labCriticalCommunicationRequestSchema.safeParse({ method: "PHONE", communicatedToName: "Dr. Ahmed", notifiedAt: "2026-01-01" }).success).toBe(false); });
  it("requires explicit read-back confirmation", () => { expect(labCriticalAcknowledgementRequestSchema.safeParse({ readBackConfirmed: true }).success).toBe(true); });
  it("rejects false read-back", () => { expect(labCriticalAcknowledgementRequestSchema.safeParse({ readBackConfirmed: false }).success).toBe(false); });
  it("requires an escalation reason", () => { expect(labCriticalEscalationRequestSchema.safeParse({ reason: "No response from first contact." }).success).toBe(true); });
});

describe("Doctor clinical review validation", () => {
  it("accepts a reviewed decision", () => { expect(doctorLabClinicalReviewRequestSchema.safeParse({ decision: "REVIEWED" }).success).toBe(true); });
  it("requires notes when follow-up is required", () => { expect(doctorLabClinicalReviewRequestSchema.safeParse({ decision: "FOLLOW_UP_REQUIRED" }).success).toBe(false); });
  it("accepts follow-up with notes", () => { expect(doctorLabClinicalReviewRequestSchema.safeParse({ decision: "FOLLOW_UP_REQUIRED", notes: "Repeat after treatment." }).success).toBe(true); });
  it("rejects forged actor fields", () => { expect(doctorLabClinicalReviewRequestSchema.safeParse({ decision: "REVIEWED", reviewerEmployeeId: "x" }).success).toBe(false); });
});
