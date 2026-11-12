import { describe, expect, it } from "vitest";
import {
  decideCriticalCommunicationAcknowledgement,
  decideCriticalCommunicationEscalation,
  decideCriticalCommunicationRecord,
  decideDoctorLabClinicalReview,
  decideLabResultRelease,
  decideLabResultReview,
  decideLabResultSubmission,
} from "../../src/server/laboratory/lab-result-review-policy";

describe("laboratory result submission policy", () => {
  it("allows the original author to submit a complete processing result", () => {
    expect(decideLabResultSubmission({ itemStatus: "PROCESSING", resultStatus: "DRAFT", authorEmployeeId: "lab-1", actorEmployeeId: "lab-1", hasResultContent: true })).toEqual({ kind: "ALLOW" });
  });
  it("rejects submission before processing", () => {
    expect(decideLabResultSubmission({ itemStatus: "RECEIVED", resultStatus: "DRAFT", authorEmployeeId: "lab-1", actorEmployeeId: "lab-1", hasResultContent: true })).toMatchObject({ kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_PROCESSING" });
  });
  it("rejects resubmitting a non-draft result", () => {
    expect(decideLabResultSubmission({ itemStatus: "PROCESSING", resultStatus: "APPROVED", authorEmployeeId: "lab-1", actorEmployeeId: "lab-1", hasResultContent: true })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_NOT_DRAFT" });
  });
  it("rejects submission by an employee other than the draft author", () => {
    expect(decideLabResultSubmission({ itemStatus: "PROCESSING", resultStatus: "DRAFT", authorEmployeeId: "lab-1", actorEmployeeId: "lab-2", hasResultContent: true })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_AUTHOR_MISMATCH" });
  });
  it("rejects empty results", () => {
    expect(decideLabResultSubmission({ itemStatus: "PROCESSING", resultStatus: "DRAFT", authorEmployeeId: "lab-1", actorEmployeeId: "lab-1", hasResultContent: false })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_CONTENT_REQUIRED" });
  });
});

describe("laboratory result review policy", () => {
  it("allows a different active reviewer to approve a pending result", () => {
    expect(decideLabResultReview({ resultStatus: "PENDING_REVIEW", authorEmployeeId: "lab-1", reviewerEmployeeId: "lab-2", decision: "APPROVED" })).toEqual({ kind: "ALLOW" });
  });
  it("allows a different active reviewer to return a result for correction", () => {
    expect(decideLabResultReview({ resultStatus: "PENDING_REVIEW", authorEmployeeId: "lab-1", reviewerEmployeeId: "lab-2", decision: "REJECTED" })).toEqual({ kind: "ALLOW" });
  });
  it("rejects author self-review", () => {
    expect(decideLabResultReview({ resultStatus: "PENDING_REVIEW", authorEmployeeId: "lab-1", reviewerEmployeeId: "lab-1", decision: "APPROVED" })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_SELF_REVIEW_FORBIDDEN" });
  });
  it("rejects review of a draft", () => {
    expect(decideLabResultReview({ resultStatus: "DRAFT", authorEmployeeId: "lab-1", reviewerEmployeeId: "lab-2", decision: "APPROVED" })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_NOT_PENDING_REVIEW" });
  });
});

describe("laboratory result release policy", () => {
  it("allows a non-critical approved result to be released", () => {
    expect(decideLabResultRelease({ resultStatus: "APPROVED", hasCriticalValues: false, hasAcknowledgedReadBack: false })).toEqual({ kind: "ALLOW" });
  });
  it("allows a critical approved result only after read-back acknowledgement", () => {
    expect(decideLabResultRelease({ resultStatus: "APPROVED", hasCriticalValues: true, hasAcknowledgedReadBack: true })).toEqual({ kind: "ALLOW" });
  });
  it("rejects critical result release without read-back", () => {
    expect(decideLabResultRelease({ resultStatus: "APPROVED", hasCriticalValues: true, hasAcknowledgedReadBack: false })).toMatchObject({ kind: "REJECT", code: "LAB_CRITICAL_COMMUNICATION_NOT_ACKNOWLEDGED" });
  });
  it("rejects release before approval", () => {
    expect(decideLabResultRelease({ resultStatus: "PENDING_REVIEW", hasCriticalValues: false, hasAcknowledgedReadBack: false })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_NOT_APPROVED" });
  });
});

describe("critical communication recording policy", () => {
  it("allows recording after approval when a critical flag exists", () => {
    expect(decideCriticalCommunicationRecord({ resultStatus: "APPROVED", hasCriticalValues: true })).toEqual({ kind: "ALLOW" });
  });
  it("rejects recording before approval", () => {
    expect(decideCriticalCommunicationRecord({ resultStatus: "PENDING_REVIEW", hasCriticalValues: true })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_NOT_APPROVED" });
  });
  it("rejects communication for a non-critical result", () => {
    expect(decideCriticalCommunicationRecord({ resultStatus: "APPROVED", hasCriticalValues: false })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_NOT_CRITICAL" });
  });
});

describe("critical communication acknowledgement policy", () => {
  it("allows the ordering Doctor to acknowledge a required read-back", () => {
    expect(decideCriticalCommunicationAcknowledgement({ status: "NOTIFIED", readBackRequired: true, readBackConfirmed: true, isOrderingDoctor: true })).toEqual({ kind: "ALLOW" });
  });
  it("allows acknowledgement after escalation", () => {
    expect(decideCriticalCommunicationAcknowledgement({ status: "ESCALATED", readBackRequired: true, readBackConfirmed: true, isOrderingDoctor: true })).toEqual({ kind: "ALLOW" });
  });
  it("rejects acknowledgement by a different Doctor", () => {
    expect(decideCriticalCommunicationAcknowledgement({ status: "NOTIFIED", readBackRequired: true, readBackConfirmed: true, isOrderingDoctor: false })).toMatchObject({ kind: "REJECT", code: "LAB_CRITICAL_DOCTOR_REQUIRED" });
  });
  it("rejects acknowledgement without read-back", () => {
    expect(decideCriticalCommunicationAcknowledgement({ status: "NOTIFIED", readBackRequired: true, readBackConfirmed: false, isOrderingDoctor: true })).toMatchObject({ kind: "REJECT", code: "LAB_CRITICAL_READ_BACK_REQUIRED" });
  });
  it("rejects acknowledgement of already acknowledged communication", () => {
    expect(decideCriticalCommunicationAcknowledgement({ status: "ACKNOWLEDGED", readBackRequired: true, readBackConfirmed: true, isOrderingDoctor: true })).toMatchObject({ kind: "REJECT", code: "LAB_CRITICAL_COMMUNICATION_NOT_ACKNOWLEDGEABLE" });
  });
});

describe("critical communication escalation policy", () => {
  it("allows escalation of a notified communication with a reason", () => {
    expect(decideCriticalCommunicationEscalation({ status: "NOTIFIED", hasReason: true })).toEqual({ kind: "ALLOW" });
  });
  it("rejects escalation without a reason", () => {
    expect(decideCriticalCommunicationEscalation({ status: "NOTIFIED", hasReason: false })).toMatchObject({ kind: "REJECT", code: "LAB_CRITICAL_ESCALATION_REASON_REQUIRED" });
  });
  it("rejects repeated escalation", () => {
    expect(decideCriticalCommunicationEscalation({ status: "ESCALATED", hasReason: true })).toMatchObject({ kind: "REJECT", code: "LAB_CRITICAL_COMMUNICATION_NOT_ESCALATABLE" });
  });
});

describe("Doctor clinical review policy", () => {
  it("allows the ordering Doctor to review a released result", () => {
    expect(decideDoctorLabClinicalReview({ resultStatus: "RELEASED", isOrderingDoctor: true })).toEqual({ kind: "ALLOW" });
  });
  it("rejects a different Doctor", () => {
    expect(decideDoctorLabClinicalReview({ resultStatus: "RELEASED", isOrderingDoctor: false })).toMatchObject({ kind: "REJECT", code: "LAB_CLINICAL_REVIEW_DOCTOR_REQUIRED" });
  });
  it("rejects unreleased results", () => {
    expect(decideDoctorLabClinicalReview({ resultStatus: "APPROVED", isOrderingDoctor: true })).toMatchObject({ kind: "REJECT", code: "LAB_RESULT_NOT_RELEASED" });
  });
});
