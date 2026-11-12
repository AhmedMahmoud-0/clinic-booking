export type LabWorkflowPolicyCode =
  | "LAB_WORKSPACE_ACCESS_REQUIRED"
  | "LAB_ORDER_ITEM_NOT_FOUND"
  | "LAB_ORDER_NOT_PROCESSABLE"
  | "LAB_ORDER_ITEM_NOT_COLLECTABLE"
  | "LAB_SAMPLE_NOT_FOUND"
  | "LAB_SAMPLE_NOT_RECEIVABLE"
  | "LAB_SAMPLE_REJECTION_REASON_REQUIRED"
  | "LAB_RESULT_NOT_EDITABLE"
  | "LAB_RESULT_AUTHOR_MISMATCH"
  | "LAB_RESULT_COMPONENT_INVALID"
  | "LAB_RESULT_VALUE_INVALID";

export function decideLabWorkspaceAccess(input: {
  employeeStatus: string;
  activeRoles: readonly string[];
}): { kind: "ALLOW" } | { kind: "REJECT"; code: "LAB_WORKSPACE_ACCESS_REQUIRED" } {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("LAB_STAFF")
    ? { kind: "ALLOW" }
    : { kind: "REJECT", code: "LAB_WORKSPACE_ACCESS_REQUIRED" };
}

export function decideLabCollection(input: {
  orderStatus: string;
  itemStatus: string;
  patientIsActive: boolean;
  latestSampleStatus: string | null;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: "LAB_ORDER_NOT_PROCESSABLE" | "LAB_ORDER_ITEM_NOT_COLLECTABLE" } {
  if (input.orderStatus === "CANCELLED" || input.itemStatus === "CANCELLED" || !input.patientIsActive) {
    return { kind: "REJECT", code: "LAB_ORDER_NOT_PROCESSABLE" };
  }
  if (input.orderStatus !== "ORDERED" && input.orderStatus !== "IN_PROGRESS") {
    return { kind: "REJECT", code: "LAB_ORDER_NOT_PROCESSABLE" };
  }
  if (input.itemStatus === "PENDING" && input.latestSampleStatus === null) return { kind: "ALLOW" };
  if (input.itemStatus === "REJECTED" && input.latestSampleStatus === "REJECTED") return { kind: "ALLOW" };
  return { kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_COLLECTABLE" };
}

export function decideLabSampleTransition(input: {
  currentStatus: string;
  action: "RECEIVE" | "REJECT";
  rejectionReason: string | null;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: "LAB_SAMPLE_NOT_RECEIVABLE" | "LAB_SAMPLE_REJECTION_REASON_REQUIRED" } {
  if (input.currentStatus !== "COLLECTED") {
    return { kind: "REJECT", code: "LAB_SAMPLE_NOT_RECEIVABLE" };
  }
  if (input.action === "REJECT" && !input.rejectionReason?.trim()) {
    return { kind: "REJECT", code: "LAB_SAMPLE_REJECTION_REASON_REQUIRED" };
  }
  return { kind: "ALLOW" };
}

export function decideLabProcessing(input: {
  itemStatus: string;
  latestSampleStatus: string | null;
}): { kind: "ALLOW" } | { kind: "REJECT"; code: "LAB_ORDER_ITEM_NOT_PROCESSABLE" } {
  return input.itemStatus === "RECEIVED" && input.latestSampleStatus === "RECEIVED"
    ? { kind: "ALLOW" }
    : { kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_PROCESSABLE" };
}

export function decideLabResultDraft(input: {
  itemStatus: string;
  existingResultStatus: string | null;
  existingAuthorEmployeeId: string | null;
  actorEmployeeId: string;
}):
  | { kind: "ALLOW" }
  | { kind: "REJECT"; code: "LAB_ORDER_ITEM_NOT_PROCESSABLE" | "LAB_RESULT_NOT_EDITABLE" | "LAB_RESULT_AUTHOR_MISMATCH" } {
  if (input.itemStatus !== "PROCESSING") {
    return { kind: "REJECT", code: "LAB_ORDER_ITEM_NOT_PROCESSABLE" };
  }
  if (input.existingResultStatus !== null && input.existingResultStatus !== "DRAFT") {
    return { kind: "REJECT", code: "LAB_RESULT_NOT_EDITABLE" };
  }
  if (input.existingAuthorEmployeeId !== null && input.existingAuthorEmployeeId !== input.actorEmployeeId) {
    return { kind: "REJECT", code: "LAB_RESULT_AUTHOR_MISMATCH" };
  }
  return { kind: "ALLOW" };
}
