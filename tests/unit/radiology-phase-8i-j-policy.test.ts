import { describe, expect, it } from "vitest";
import {
  decideDoctorRadiologyClinicalReview,
  decideExternalRadiologyTransition,
  decideRadiologyCriticalAcknowledgement,
  decideRadiologyCriticalCommunication,
  decideRadiologyCriticalEscalation,
  decideRadiologyExamCompletion,
  decideRadiologyExamStart,
  decideRadiologyReportRelease,
  decideRadiologyReportReview,
  decideRadiologyReportSubmission,
} from "../../src/server/radiology/radiology-phase-8i-j-policy";

describe("radiology exam execution policy", () => {
  it("starts only a scheduled exam after the readiness gate passes", () => {
    expect(decideRadiologyExamStart({ examStatus: "SCHEDULED", itemStatus: "SCHEDULED", orderStatus: "SCHEDULED", readinessPassed: true })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyExamStart({ examStatus: "SCHEDULED", itemStatus: "SCHEDULED", orderStatus: "IN_PROGRESS", readinessPassed: true })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyExamStart({ examStatus: "SCHEDULED", itemStatus: "SCHEDULED", orderStatus: "CANCELLED", readinessPassed: true })).toEqual({ kind: "REJECT", code: "RADIOLOGY_ORDER_NOT_ACTIVE" });
    expect(decideRadiologyExamStart({ examStatus: "SCHEDULED", itemStatus: "SCHEDULED", orderStatus: "SCHEDULED", readinessPassed: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_EXAM_NOT_READY" });
    expect(decideRadiologyExamStart({ examStatus: "IN_PROGRESS", itemStatus: "IN_PROGRESS", orderStatus: "IN_PROGRESS", readinessPassed: true })).toEqual({ kind: "REJECT", code: "RADIOLOGY_EXAM_NOT_SCHEDULED" });
  });
  it("completes only an in-progress exam and order item", () => {
    expect(decideRadiologyExamCompletion({ examStatus: "IN_PROGRESS", itemStatus: "IN_PROGRESS" })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyExamCompletion({ examStatus: "SCHEDULED", itemStatus: "SCHEDULED" })).toEqual({ kind: "REJECT", code: "RADIOLOGY_EXAM_NOT_IN_PROGRESS" });
  });
});

describe("radiology report drafting and approval policy", () => {
  it("submits only the author's complete draft with a critical reason when needed", () => {
    const valid = { status: "DRAFT", authorEmployeeId: "rad-1", actorEmployeeId: "rad-1", hasFindings: true, hasImpression: true, criticalReasonValid: true };
    expect(decideRadiologyReportSubmission(valid)).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyReportSubmission({ ...valid, actorEmployeeId: "rad-2" })).toEqual({ kind: "REJECT", code: "RADIOLOGY_REPORT_AUTHOR_REQUIRED" });
    expect(decideRadiologyReportSubmission({ ...valid, criticalReasonValid: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_REPORT_CRITICAL_REASON_REQUIRED" });
    expect(decideRadiologyReportSubmission({ ...valid, hasFindings: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_REPORT_CONTENT_REQUIRED" });
  });
  it("requires a different Radiologist for independent report approval", () => {
    expect(decideRadiologyReportReview({ status: "PENDING_APPROVAL", authorEmployeeId: "rad-1", reviewerEmployeeId: "rad-2" })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyReportReview({ status: "PENDING_APPROVAL", authorEmployeeId: "rad-1", reviewerEmployeeId: "rad-1" })).toEqual({ kind: "REJECT", code: "RADIOLOGY_REPORT_SELF_REVIEW_FORBIDDEN" });
  });
  it("blocks critical report release until every read-back communication is acknowledged", () => {
    expect(decideRadiologyReportRelease({ status: "APPROVED", isCritical: false, communicationCount: 0, everyCommunicationAcknowledged: false })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyReportRelease({ status: "APPROVED", isCritical: true, communicationCount: 0, everyCommunicationAcknowledged: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_CRITICAL_READ_BACK_REQUIRED" });
    expect(decideRadiologyReportRelease({ status: "APPROVED", isCritical: true, communicationCount: 2, everyCommunicationAcknowledged: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_CRITICAL_READ_BACK_REQUIRED" });
    expect(decideRadiologyReportRelease({ status: "APPROVED", isCritical: true, communicationCount: 1, everyCommunicationAcknowledged: true })).toEqual({ kind: "ALLOW" });
  });
});

describe("radiology critical communication policy", () => {
  it("allows communication only for an approved report marked critical", () => {
    expect(decideRadiologyCriticalCommunication({ reportStatus: "APPROVED", isCritical: true })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyCriticalCommunication({ reportStatus: "DRAFT", isCritical: true })).toEqual({ kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_APPROVED" });
    expect(decideRadiologyCriticalCommunication({ reportStatus: "APPROVED", isCritical: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_CRITICAL" });
  });
  it("requires ordering-Doctor identity and explicit read-back to acknowledge", () => {
    expect(decideRadiologyCriticalAcknowledgement({ status: "NOTIFIED", readBackRequired: true, readBackConfirmed: true, isOrderingDoctor: true })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyCriticalAcknowledgement({ status: "NOTIFIED", readBackRequired: true, readBackConfirmed: false, isOrderingDoctor: true })).toEqual({ kind: "REJECT", code: "RADIOLOGY_CRITICAL_READ_BACK_REQUIRED" });
    expect(decideRadiologyCriticalAcknowledgement({ status: "NOTIFIED", readBackRequired: true, readBackConfirmed: true, isOrderingDoctor: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_CRITICAL_DOCTOR_REQUIRED" });
  });
  it("escalates only open notified communications with a reason", () => {
    expect(decideRadiologyCriticalEscalation({ status: "NOTIFIED", hasReason: true })).toEqual({ kind: "ALLOW" });
    expect(decideRadiologyCriticalEscalation({ status: "NOTIFIED", hasReason: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_CRITICAL_ESCALATION_REASON_REQUIRED" });
    expect(decideRadiologyCriticalEscalation({ status: "ACKNOWLEDGED", hasReason: true })).toEqual({ kind: "REJECT", code: "RADIOLOGY_CRITICAL_COMMUNICATION_NOT_ESCALATABLE" });
  });
});

describe("ordering Doctor and external radiology policy", () => {
  it("limits clinical review to the assigned Doctor after report release", () => {
    expect(decideDoctorRadiologyClinicalReview({ reportStatus: "RELEASED", isOrderingDoctor: true })).toEqual({ kind: "ALLOW" });
    expect(decideDoctorRadiologyClinicalReview({ reportStatus: "APPROVED", isOrderingDoctor: true })).toEqual({ kind: "REJECT", code: "RADIOLOGY_REPORT_NOT_RELEASED" });
    expect(decideDoctorRadiologyClinicalReview({ reportStatus: "RELEASED", isOrderingDoctor: false })).toEqual({ kind: "REJECT", code: "RADIOLOGY_CLINICAL_REVIEW_DOCTOR_REQUIRED" });
  });
  it("enforces external radiology referral, receipt, and review ordering", () => {
    expect(decideExternalRadiologyTransition({ status: "REFERRED", action: "RECEIVE_RESULT" })).toEqual({ kind: "ALLOW" });
    expect(decideExternalRadiologyTransition({ status: "RESULT_RECEIVED", action: "RECEIVE_RESULT" })).toEqual({ kind: "REJECT", code: "EXTERNAL_RADIOLOGY_NOT_AWAITING_RESULT" });
    expect(decideExternalRadiologyTransition({ status: "RESULT_RECEIVED", action: "REVIEW_RESULT" })).toEqual({ kind: "ALLOW" });
    expect(decideExternalRadiologyTransition({ status: "REFERRED", action: "REVIEW_RESULT" })).toEqual({ kind: "REJECT", code: "EXTERNAL_RADIOLOGY_RESULT_NOT_REVIEWABLE" });
  });
});
