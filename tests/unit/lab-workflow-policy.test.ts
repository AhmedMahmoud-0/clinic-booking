import { describe, expect, it } from "vitest";
import {
  decideLabCollection,
  decideLabProcessing,
  decideLabResultDraft,
  decideLabSampleTransition,
  decideLabWorkspaceAccess,
} from "../../src/server/laboratory/lab-workflow-policy";


describe("Lab Staff authorization policy", () => {
  it("allows an active Lab Staff employee", () => {
    expect(decideLabWorkspaceAccess({ employeeStatus: "ACTIVE", activeRoles: ["LAB_STAFF"] })).toEqual({ kind: "ALLOW" });
  });
  it("rejects an inactive employee", () => {
    expect(decideLabWorkspaceAccess({ employeeStatus: "INACTIVE", activeRoles: ["LAB_STAFF"] })).toEqual({ kind: "REJECT", code: "LAB_WORKSPACE_ACCESS_REQUIRED" });
  });
  it("rejects other clinic roles", () => {
    expect(decideLabWorkspaceAccess({ employeeStatus: "ACTIVE", activeRoles: ["DOCTOR", "NURSE"] })).toEqual({ kind: "REJECT", code: "LAB_WORKSPACE_ACCESS_REQUIRED" });
  });
});

describe("Lab specimen collection policy", () => {
  it("allows a pending item on an ordered order", () => {
    expect(decideLabCollection({ orderStatus: "ORDERED", itemStatus: "PENDING", patientIsActive: true, latestSampleStatus: null })).toEqual({ kind: "ALLOW" });
  });
  it("allows a pending item on an order already in progress", () => {
    expect(decideLabCollection({ orderStatus: "IN_PROGRESS", itemStatus: "PENDING", patientIsActive: true, latestSampleStatus: null })).toEqual({ kind: "ALLOW" });
  });
  it("allows recollection only after the latest sample was rejected", () => {
    expect(decideLabCollection({ orderStatus: "IN_PROGRESS", itemStatus: "REJECTED", patientIsActive: true, latestSampleStatus: "REJECTED" })).toEqual({ kind: "ALLOW" });
  });
  it("rejects recollection when the latest sample is still collected", () => {
    expect(decideLabCollection({ orderStatus: "IN_PROGRESS", itemStatus: "REJECTED", patientIsActive: true, latestSampleStatus: "COLLECTED" })).toEqual({ kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_COLLECTABLE" });
  });
  it("rejects a second collection while the current sample is active", () => {
    expect(decideLabCollection({ orderStatus: "IN_PROGRESS", itemStatus: "COLLECTED", patientIsActive: true, latestSampleStatus: "COLLECTED" })).toEqual({ kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_COLLECTABLE" });
  });
  it("rejects cancelled orders and items", () => {
    expect(decideLabCollection({ orderStatus: "CANCELLED", itemStatus: "PENDING", patientIsActive: true, latestSampleStatus: null }).kind).toBe("REJECT");
    expect(decideLabCollection({ orderStatus: "IN_PROGRESS", itemStatus: "CANCELLED", patientIsActive: true, latestSampleStatus: null }).kind).toBe("REJECT");
  });
  it("rejects inactive patients", () => {
    expect(decideLabCollection({ orderStatus: "IN_PROGRESS", itemStatus: "PENDING", patientIsActive: false, latestSampleStatus: null })).toEqual({ kind: "REJECT", code: "LAB_ORDER_NOT_PROCESSABLE" });
  });
  it("rejects a released workflow status not supported by collection", () => {
    expect(decideLabCollection({ orderStatus: "COMPLETED", itemStatus: "PENDING", patientIsActive: true, latestSampleStatus: null })).toEqual({ kind: "REJECT", code: "LAB_ORDER_NOT_PROCESSABLE" });
  });
});

describe("Lab specimen receipt and rejection policy", () => {
  it("allows receiving a collected sample", () => {
    expect(decideLabSampleTransition({ currentStatus: "COLLECTED", action: "RECEIVE", rejectionReason: null })).toEqual({ kind: "ALLOW" });
  });
  it("allows rejection with a non-empty reason", () => {
    expect(decideLabSampleTransition({ currentStatus: "COLLECTED", action: "REJECT", rejectionReason: "Insufficient volume" })).toEqual({ kind: "ALLOW" });
  });
  it("requires a reason to reject", () => {
    expect(decideLabSampleTransition({ currentStatus: "COLLECTED", action: "REJECT", rejectionReason: " " })).toEqual({ kind: "REJECT", code: "LAB_SAMPLE_REJECTION_REASON_REQUIRED" });
  });
  it("does not allow repeated receipt or rejection", () => {
    expect(decideLabSampleTransition({ currentStatus: "RECEIVED", action: "RECEIVE", rejectionReason: null })).toEqual({ kind: "REJECT", code: "LAB_SAMPLE_NOT_RECEIVABLE" });
    expect(decideLabSampleTransition({ currentStatus: "REJECTED", action: "REJECT", rejectionReason: "Clotted" })).toEqual({ kind: "REJECT", code: "LAB_SAMPLE_NOT_RECEIVABLE" });
  });
});

describe("Lab processing and result draft policy", () => {
  it("starts processing only from a received item and received latest sample", () => {
    expect(decideLabProcessing({ itemStatus: "RECEIVED", latestSampleStatus: "RECEIVED" })).toEqual({ kind: "ALLOW" });
  });
  it("rejects processing before sample receipt", () => {
    expect(decideLabProcessing({ itemStatus: "COLLECTED", latestSampleStatus: "COLLECTED" })).toEqual({ kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_PROCESSABLE" });
  });
  it("allows the first result draft for an item in processing", () => {
    expect(decideLabResultDraft({ itemStatus: "PROCESSING", existingResultStatus: null, existingAuthorEmployeeId: null, actorEmployeeId: "lab-1" })).toEqual({ kind: "ALLOW" });
  });
  it("allows the original author to update their draft", () => {
    expect(decideLabResultDraft({ itemStatus: "PROCESSING", existingResultStatus: "DRAFT", existingAuthorEmployeeId: "lab-1", actorEmployeeId: "lab-1" })).toEqual({ kind: "ALLOW" });
  });
  it("rejects a different employee editing the draft", () => {
    expect(decideLabResultDraft({ itemStatus: "PROCESSING", existingResultStatus: "DRAFT", existingAuthorEmployeeId: "lab-1", actorEmployeeId: "lab-2" })).toEqual({ kind: "REJECT", code: "LAB_RESULT_AUTHOR_MISMATCH" });
  });
  it("rejects editing results after submission or approval", () => {
    expect(decideLabResultDraft({ itemStatus: "PROCESSING", existingResultStatus: "PENDING_REVIEW", existingAuthorEmployeeId: "lab-1", actorEmployeeId: "lab-1" })).toEqual({ kind: "REJECT", code: "LAB_RESULT_NOT_EDITABLE" });
    expect(decideLabResultDraft({ itemStatus: "PROCESSING", existingResultStatus: "RELEASED", existingAuthorEmployeeId: "lab-1", actorEmployeeId: "lab-1" })).toEqual({ kind: "REJECT", code: "LAB_RESULT_NOT_EDITABLE" });
  });
  it("rejects result entry before processing", () => {
    expect(decideLabResultDraft({ itemStatus: "RECEIVED", existingResultStatus: null, existingAuthorEmployeeId: null, actorEmployeeId: "lab-1" })).toEqual({ kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_PROCESSABLE" });
  });
});

