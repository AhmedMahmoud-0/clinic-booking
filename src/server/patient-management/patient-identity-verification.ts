import "server-only";

import type { Prisma } from "../../../generated/prisma/client";

import { getPrismaClient } from "../db/client";
import { PatientManagementError } from "./errors";
import {
  verifyPatientIdentityMatch,
  type PatientIdentityVerificationInput,
  type PatientIdentityVerificationRecord,
} from "./identity-verification-validation";

type IdentityVerificationTransaction = Pick<
  Prisma.TransactionClient,
  "patient" | "identityVerification" | "auditLog"
>;

/**
 * Verify an existing active Patient using two distinct identifiers that are
 * actually represented on the Patient record. Only identifier types and the
 * outcome are persisted; submitted values are never stored or audited.
 */
export async function verifyPatientIdentity(
  patientId: string,
  input: PatientIdentityVerificationInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (transaction: IdentityVerificationTransaction) => {
    const patient = await transaction.patient.findFirst({
      where: { id: patientId, isActive: true },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        middleName: true,
        lastName: true,
        dateOfBirth: true,
        contacts: {
          where: { type: "PHONE" },
          select: { normalizedValue: true },
        },
      },
    });

    if (!patient) {
      throw new PatientManagementError(
        "ACTIVE_PATIENT_REQUIRED",
        "An active patient record is required for identity verification.",
        404,
      );
    }

    const result = verifyPatientIdentityMatch(
      patient as PatientIdentityVerificationRecord,
      input,
    )
      ? "VERIFIED"
      : "FAILED";
    const verifiedAt = new Date();

    const verification = await transaction.identityVerification.create({
      data: {
        patientId: patient.id,
        firstElement: input.firstIdentifier.type,
        secondElement: input.secondIdentifier.type,
        result,
        performedByEmployeeId: actorEmployeeId,
        verifiedAt,
        notes: "Two distinct patient identity elements were compared. Submitted values are not retained.",
      },
      select: {
        id: true,
        result: true,
        firstElement: true,
        secondElement: true,
        verifiedAt: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action:
          result === "VERIFIED"
            ? "PATIENT_IDENTITY_VERIFIED"
            : "PATIENT_IDENTITY_VERIFICATION_FAILED",
        entityType: "IdentityVerification",
        entityId: verification.id,
        reason:
          result === "VERIFIED"
            ? "Two distinct stored patient identity elements matched. Submitted values were not retained."
            : "The two submitted patient identity elements did not both match. Submitted values were not retained.",
        occurredAt: verifiedAt,
      },
    });

    return {
      verificationId: verification.id,
      patientId: patient.id,
      result: verification.result,
      elements: [verification.firstElement, verification.secondElement],
      verifiedAt: verification.verifiedAt.toISOString(),
    };
  });
}
