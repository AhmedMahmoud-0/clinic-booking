import "server-only";

import type { Prisma } from "../../../generated/prisma/client";

type QueueAllocationTransaction = Pick<Prisma.TransactionClient, "$queryRaw" | "queueEntry">;

/**
 * Allocate a per-doctor, per-Cairo-local-day ticket number.
 *
 * The DoctorProfile row is the mutex shared by appointment check-in and future
 * walk-in registration. Every QueueEntry creator must use this helper in the
 * same transaction as its QueueEntry insert; do not compute MAX+1 without it.
 */
export async function allocateNextDoctorQueueNumber(
  transaction: QueueAllocationTransaction,
  doctorId: string,
  queueDate: Date,
): Promise<number> {
  const lockedDoctor = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "DoctorProfile" WHERE "id" = ${doctorId} FOR UPDATE
  `;

  if (lockedDoctor.length !== 1) {
    throw new Error("The appointment doctor profile is unavailable for queue allocation.");
  }

  const current = await transaction.queueEntry.aggregate({
    where: { doctorId, queueDate },
    _max: { queueNumber: true },
  });

  return (current._max.queueNumber ?? 0) + 1;
}
