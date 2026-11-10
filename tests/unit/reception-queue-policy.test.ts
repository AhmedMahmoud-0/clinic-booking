import { describe, expect, it } from "vitest";
import {
  RECEPTION_QUEUE_ACTIVE_STATUSES,
  decideCallNext,
  getQueueWaitingMinutes,
  isActiveReceptionQueueActor,
  summarizeReceptionQueue,
} from "../../src/server/appointments/reception-queue-policy";

describe("Reception queue policy", () => {
  it("requires an active employee and active Reception role", () => {
    expect(isActiveReceptionQueueActor({ employeeStatus: "ACTIVE", activeRoles: ["RECEPTION"] })).toBe(true);
    expect(isActiveReceptionQueueActor({ employeeStatus: "INACTIVE", activeRoles: ["RECEPTION"] })).toBe(false);
    expect(isActiveReceptionQueueActor({ employeeStatus: "ACTIVE", activeRoles: ["DOCTOR"] })).toBe(false);
  });

  it("exposes only operational active statuses as the active queue set", () => {
    expect(RECEPTION_QUEUE_ACTIVE_STATUSES).toEqual(["WAITING", "CALLED", "IN_SERVICE"]);
  });

  it("returns the existing called ticket instead of calling a second patient", () => {
    expect(decideCallNext({
      currentCalledEntryId: "queue-called",
      nextWaitingEntry: { id: "queue-waiting", patientIsActive: true },
    })).toEqual({ kind: "RETURN_CURRENT_CALL", queueEntryId: "queue-called" });
  });

  it("calls the next waiting ticket when no ticket is currently called", () => {
    expect(decideCallNext({
      currentCalledEntryId: null,
      nextWaitingEntry: { id: "queue-next", patientIsActive: true },
    })).toEqual({ kind: "CALL_NEXT", queueEntryId: "queue-next" });
  });

  it("does not skip an inactive patient at the head of the queue", () => {
    expect(decideCallNext({
      currentCalledEntryId: null,
      nextWaitingEntry: { id: "queue-inactive", patientIsActive: false },
    })).toEqual({ kind: "BLOCK_INACTIVE_PATIENT", queueEntryId: "queue-inactive" });
  });

  it("returns an empty result when no ticket is waiting", () => {
    expect(decideCallNext({ currentCalledEntryId: null, nextWaitingEntry: null })).toEqual({ kind: "QUEUE_EMPTY" });
  });

  it("summarizes the queue by every persisted status", () => {
    expect(summarizeReceptionQueue([
      "WAITING", "WAITING", "CALLED", "IN_SERVICE", "COMPLETED", "LEFT", "CANCELLED",
    ])).toEqual({ waiting: 2, called: 1, inService: 1, completed: 1, left: 1, cancelled: 1 });
  });

  it("calculates whole waiting minutes without negative values", () => {
    const now = new Date("2026-11-09T10:15:00.000Z");
    expect(getQueueWaitingMinutes({ checkedInAt: new Date("2026-11-09T10:05:30.000Z"), now, status: "WAITING" })).toBe(9);
    expect(getQueueWaitingMinutes({ checkedInAt: new Date("2026-11-09T10:20:00.000Z"), now, status: "WAITING" })).toBe(0);
  });

  it("calculates wait time for a called ticket until doctor service begins", () => {
    expect(getQueueWaitingMinutes({
      checkedInAt: new Date("2026-11-09T10:00:00.000Z"),
      now: new Date("2026-11-09T10:12:00.000Z"),
      status: "CALLED",
    })).toBe(12);
  });

  it("does not show waiting minutes for in-service or terminal entries", () => {
    const input = { checkedInAt: new Date("2026-11-09T10:00:00.000Z"), now: new Date("2026-11-09T10:20:00.000Z") };
    expect(getQueueWaitingMinutes({ ...input, status: "IN_SERVICE" })).toBeNull();
    expect(getQueueWaitingMinutes({ ...input, status: "COMPLETED" })).toBeNull();
  });
});
