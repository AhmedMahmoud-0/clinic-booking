export const RECEPTION_QUEUE_ACTIVE_STATUSES = ["WAITING", "CALLED", "IN_SERVICE"] as const;

export type ReceptionQueueStatus =
  | "WAITING"
  | "CALLED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "LEFT"
  | "CANCELLED";

export interface ReceptionQueueActorInput {
  employeeStatus: string;
  activeRoles: readonly string[];
}

export function isActiveReceptionQueueActor(input: ReceptionQueueActorInput): boolean {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("RECEPTION");
}

export type CallNextDecision =
  | { kind: "RETURN_CURRENT_CALL"; queueEntryId: string }
  | { kind: "CALL_NEXT"; queueEntryId: string }
  | { kind: "QUEUE_EMPTY" }
  | { kind: "BLOCK_INACTIVE_PATIENT"; queueEntryId: string };

/**
 * Keep a single outstanding CALLED ticket per doctor/day. Do not silently skip
 * an inactive patient at the head of the queue; Reception must resolve it.
 */
export function decideCallNext(input: {
  currentCalledEntryId: string | null;
  nextWaitingEntry: { id: string; patientIsActive: boolean } | null;
}): CallNextDecision {
  if (input.currentCalledEntryId) {
    return { kind: "RETURN_CURRENT_CALL", queueEntryId: input.currentCalledEntryId };
  }
  if (!input.nextWaitingEntry) return { kind: "QUEUE_EMPTY" };
  if (!input.nextWaitingEntry.patientIsActive) {
    return { kind: "BLOCK_INACTIVE_PATIENT", queueEntryId: input.nextWaitingEntry.id };
  }
  return { kind: "CALL_NEXT", queueEntryId: input.nextWaitingEntry.id };
}

export function summarizeReceptionQueue(statuses: readonly ReceptionQueueStatus[]) {
  return {
    waiting: statuses.filter((status) => status === "WAITING").length,
    called: statuses.filter((status) => status === "CALLED").length,
    inService: statuses.filter((status) => status === "IN_SERVICE").length,
    completed: statuses.filter((status) => status === "COMPLETED").length,
    left: statuses.filter((status) => status === "LEFT").length,
    cancelled: statuses.filter((status) => status === "CANCELLED").length,
  };
}

export function getQueueWaitingMinutes(input: { checkedInAt: Date; now: Date; status: ReceptionQueueStatus }): number | null {
  const checkedInAt = input.checkedInAt.getTime();
  const now = input.now.getTime();
  if (!Number.isFinite(checkedInAt) || !Number.isFinite(now)) return null;
  if (input.status !== "WAITING" && input.status !== "CALLED") return null;
  return Math.max(0, Math.floor((now - checkedInAt) / 60_000));
}
