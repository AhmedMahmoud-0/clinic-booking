import "server-only";

import { getPrismaClient } from "../../db/client";
import { AccountLinkError } from "./common";
import {
  matchesPatientIdentifier,
  normalizeEmail,
  type PatientAccountLinkInput,
} from "./validation";

export type PatientAccountLinkResult =
  | { linked: true; patientAccountId: string }
  | { linked: false; reason: "IDENTITY_MISMATCH" };

/**
 * Link an existing verified Better Auth identity to a patient record only after
 * an authorized employee confirms two distinct identifiers from the clinic
 * record. Raw identifier values are never persisted or written to audit logs.
 */
export async function linkPatientAccount(
  input: PatientAccountLinkInput,
  actorEmployeeId: string,
): Promise<PatientAccountLinkResult> {
  const prisma = getPrismaClient();
  const email = normalizeEmail(input.email);

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      throw new AccountLinkError(
        "VERIFIED_AUTH_IDENTITY_REQUIRED",
        "A verified sign-in identity for this email address is required.",
        409,
      );
    }

    const patient = await transaction.patient.findUnique({
      where: { id: input.patientId },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        middleName: true,
        lastName: true,
        dateOfBirth: true,
        isActive: true,
        contacts: {
          where: { type: "PHONE" },
          select: { type: true, normalizedValue: true },
        },
      },
    });

    if (!patient || !patient.isActive) {
      throw new AccountLinkError(
        "ACTIVE_PATIENT_REQUIRED",
        "An active patient record is required.",
        404,
      );
    }

    const existingLink = await transaction.patientAccount.findFirst({
      where: {
        OR: [{ userId: user.id }, { patientId: patient.id }],
      },
      select: { id: true },
    });

    if (existingLink) {
      throw new AccountLinkError(
        "PATIENT_ACCOUNT_ALREADY_LINKED",
        "The sign-in identity or patient record is already linked.",
        409,
      );
    }

    const emailUsedByAnotherPatient = await transaction.patientContact.findFirst({
      where: {
        type: "EMAIL",
        normalizedValue: email,
        patientId: { not: patient.id },
      },
      select: { id: true },
    });

    if (emailUsedByAnotherPatient) {
      throw new AccountLinkError(
        "PATIENT_EMAIL_CONFLICT",
        "This email address is already recorded on another patient profile.",
        409,
      );
    }

    const firstMatches = matchesPatientIdentifier(patient, input.firstIdentifier);
    const secondMatches = matchesPatientIdentifier(patient, input.secondIdentifier);
    const now = new Date();

    if (!firstMatches || !secondMatches) {
      const verification = await transaction.identityVerification.create({
        data: {
          patientId: patient.id,
          firstElement: input.firstIdentifier.type,
          secondElement: input.secondIdentifier.type,
          result: "FAILED",
          performedByEmployeeId: actorEmployeeId,
          verifiedAt: now,
          notes: "Patient account-linking identity check failed.",
        },
        select: { id: true },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "PATIENT_IDENTITY_CHECK_FAILED",
          entityType: "IdentityVerification",
          entityId: verification.id,
          reason: "Patient account linking was not completed because the two identifiers did not match.",
          occurredAt: now,
        },
      });

      return { linked: false, reason: "IDENTITY_MISMATCH" };
    }

    await transaction.identityVerification.create({
      data: {
        patientId: patient.id,
        firstElement: input.firstIdentifier.type,
        secondElement: input.secondIdentifier.type,
        result: "VERIFIED",
        performedByEmployeeId: actorEmployeeId,
        verifiedAt: now,
        notes: "Patient identity verified for account linking using two distinct identifiers.",
      },
    });

    // The Better Auth email is already verified. Record it as a verified patient
    // contact only after the employee has completed the in-clinic identity check.
    await transaction.patientContact.upsert({
      where: {
        patientId_type_normalizedValue: {
          patientId: patient.id,
          type: "EMAIL",
          normalizedValue: email,
        },
      },
      create: {
        patientId: patient.id,
        type: "EMAIL",
        value: user.email,
        normalizedValue: email,
        isPrimary: false,
        verifiedAt: now,
      },
      update: {
        value: user.email,
        verifiedAt: now,
      },
    });

    const patientAccount = await transaction.patientAccount.create({
      data: {
        userId: user.id,
        patientId: patient.id,
        linkedAt: now,
        verifiedAt: now,
        verifiedByEmployeeId: actorEmployeeId,
      },
      select: { id: true },
    });

    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "PATIENT_ACCOUNT_LINKED",
        entityType: "PatientAccount",
        entityId: patientAccount.id,
        reason: input.reason,
        occurredAt: now,
      },
    });

    return { linked: true, patientAccountId: patientAccount.id };
  });
}
