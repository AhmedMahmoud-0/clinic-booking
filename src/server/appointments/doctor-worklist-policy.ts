export type DoctorWorklistQueueStatus =
  | "WAITING"
  | "CALLED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "LEFT"
  | "CANCELLED";

export interface DoctorWorklistActorInput {
  employeeStatus: string;
  activeRoles: readonly string[];
}

/** A Doctor worklist is available only to an active employee with an active Doctor role. */
export function isActiveDoctorWorklistActor(input: DoctorWorklistActorInput): boolean {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("DOCTOR");
}

/** Summarize all persisted queue states without silently treating terminal tickets as active. */
export function summarizeDoctorWorklist(statuses: readonly DoctorWorklistQueueStatus[]) {
  return {
    waiting: statuses.filter((status) => status === "WAITING").length,
    called: statuses.filter((status) => status === "CALLED").length,
    inService: statuses.filter((status) => status === "IN_SERVICE").length,
    completed: statuses.filter((status) => status === "COMPLETED").length,
    left: statuses.filter((status) => status === "LEFT").length,
    cancelled: statuses.filter((status) => status === "CANCELLED").length,
  };
}

/** Waiting time stops when service begins; future timestamps never produce negative minutes. */
export function getDoctorQueueWaitingMinutes(input: {
  checkedInAt: Date;
  now: Date;
  status: DoctorWorklistQueueStatus;
}): number | null {
  const checkedInAt = input.checkedInAt.getTime();
  const now = input.now.getTime();
  if (!Number.isFinite(checkedInAt) || !Number.isFinite(now)) return null;
  if (input.status !== "WAITING" && input.status !== "CALLED") return null;
  return Math.max(0, Math.floor((now - checkedInAt) / 60_000));
}


/** Resolve the Encounter through the one origin allowed for each queue source. */
export function resolveDoctorWorklistEncounter<T>(input: {
  queueType: string;
  appointmentEncounter: T | null;
  queueEncounter: T | null;
}): T | null {
  if (input.queueType === "APPOINTMENT") return input.appointmentEncounter;
  if (input.queueType === "WALK_IN") return input.queueEncounter;
  return null;
}
