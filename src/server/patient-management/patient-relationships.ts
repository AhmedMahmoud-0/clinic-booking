import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { getCairoDateString } from "./validation";
import { PatientRelationshipError } from "./patient-relationship-errors";
import { isEligibleForLegalGuardianVerification } from "./patient-relationship-policy";
import type {
  CorrectPatientRelationshipInput,
  CreatePatientRelationshipInput,
  DeactivatePatientRelationshipInput,
  VerifyPatientLegalGuardianInput,
} from "./patient-relationship-validation";

type Transaction = Prisma.TransactionClient;

const patientIdentitySelect = {
  id: true,
  mrn: true,
  firstName: true,
  middleName: true,
  lastName: true,
  isActive: true,
} as const;

const relationshipSelect = {
  id: true,
  relationshipType: true,
  isLegalGuardian: true,
  guardianVerifiedAt: true,
  guardianEvidenceType: true,
  guardianEvidenceAttachmentId: true,
  isActive: true,
  deactivatedAt: true,
  deactivatedByEmployeeId: true,
  createdAt: true,
  updatedAt: true,
  relatedPatient: { select: patientIdentitySelect },
  guardianVerifiedBy: {
    select: { employeeNumber: true, firstName: true, lastName: true },
  },
  deactivatedBy: {
    select: { employeeNumber: true, firstName: true, lastName: true },
  },
} as const;

function displayName(patient: { firstName: string; middleName: string | null; lastName: string }): string {
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" ");
}

async function recordRelationshipAudit(
  transaction: Transaction,
  actorEmployeeId: string,
  action: string,
  relationshipId: string,
  reason: string,
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      actorType: "EMPLOYEE",
      actorEmployeeId,
      action,
      entityType: "PatientRelationship",
      entityId: relationshipId,
      reason: reason.slice(0, 500),
    },
  });
}

export async function getPatientRelationships(patientId: string) {
  const prisma = getPrismaClient();
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, isActive: true },
    select: patientIdentitySelect,
  });
  if (!patient) {
    throw new PatientRelationshipError("ACTIVE_PATIENT_REQUIRED", "An active patient record is required.", 404);
  }

  const records = await prisma.patientRelationship.findMany({
    where: { patientId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: relationshipSelect,
  });

  return {
    patient: { id: patient.id, mrn: patient.mrn, displayName: displayName(patient) },
    relationships: records.map((record) => ({
      id: record.id,
      relationshipType: record.relationshipType,
      isLegalGuardian: record.isLegalGuardian,
      guardianVerifiedAt: record.guardianVerifiedAt,
      guardianEvidenceType: record.guardianEvidenceType,
      guardianEvidenceAttachmentId: record.guardianEvidenceAttachmentId,
      guardianVerifiedBy: record.guardianVerifiedBy,
      isActive: record.isActive,
      deactivatedAt: record.deactivatedAt,
      deactivatedBy: record.deactivatedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      relatedPatient: {
        id: record.relatedPatient.id,
        mrn: record.relatedPatient.mrn,
        displayName: displayName(record.relatedPatient),
        isActive: record.relatedPatient.isActive,
      },
    })),
  };
}

export async function createPatientRelationship(
  patientId: string,
  input: CreatePatientRelationshipInput,
  actorEmployeeId: string,
) {
  if (patientId === input.relatedPatientId) {
    throw new PatientRelationshipError(
      "PATIENT_RELATIONSHIP_SELF_LINK_NOT_ALLOWED",
      "A patient cannot be linked as their own family member.",
      400,
    );
  }

  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const [patient, relatedPatient, direct] = await Promise.all([
      transaction.patient.findFirst({ where: { id: patientId, isActive: true }, select: { id: true } }),
      transaction.patient.findFirst({ where: { id: input.relatedPatientId, isActive: true }, select: { id: true } }),
      transaction.patientRelationship.findUnique({
        where: { patientId_relatedPatientId: { patientId, relatedPatientId: input.relatedPatientId } },
        select: { id: true },
      }),
    ]);

    if (!patient) {
      throw new PatientRelationshipError("ACTIVE_PATIENT_REQUIRED", "The subject patient record is not active or was not found.", 404);
    }
    if (!relatedPatient) {
      throw new PatientRelationshipError("RELATED_PATIENT_NOT_FOUND", "The related person must have an active patient record.", 404);
    }
    if (direct) {
      throw new PatientRelationshipError(
        "PATIENT_RELATIONSHIP_ALREADY_RECORDED",
        "This directed family relationship is already recorded for the subject patient.",
        409,
      );
    }

    const relationship = await transaction.patientRelationship.create({
      data: {
        patientId,
        relatedPatientId: input.relatedPatientId,
        relationshipType: input.relationshipType,
      },
      select: relationshipSelect,
    });

    await recordRelationshipAudit(
      transaction,
      actorEmployeeId,
      "PATIENT_FAMILY_RELATIONSHIP_CREATED",
      relationship.id,
      `relationshipType=${relationship.relationshipType}; relatedPatientId=${relationship.relatedPatient.id}. Family relationship alone grants no patient data or portal access.`,
    );

    return {
      id: relationship.id,
      relationshipType: relationship.relationshipType,
      isLegalGuardian: relationship.isLegalGuardian,
      guardianVerifiedAt: relationship.guardianVerifiedAt,
      guardianEvidenceType: relationship.guardianEvidenceType,
      guardianEvidenceAttachmentId: relationship.guardianEvidenceAttachmentId,
      isActive: relationship.isActive,
      createdAt: relationship.createdAt,
      updatedAt: relationship.updatedAt,
      relatedPatient: {
        id: relationship.relatedPatient.id,
        mrn: relationship.relatedPatient.mrn,
        displayName: displayName(relationship.relatedPatient),
        isActive: relationship.relatedPatient.isActive,
      },
    };
  }, { isolationLevel: "Serializable" });
}

export async function correctPatientRelationship(
  patientId: string,
  relationshipId: string,
  input: CorrectPatientRelationshipInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  const now = new Date();
  return prisma.$transaction(async (transaction: Transaction) => {
    const relationship = await transaction.patientRelationship.findFirst({
      where: { id: relationshipId, patientId },
      select: {
        id: true,
        relatedPatientId: true,
        relationshipType: true,
        isActive: true,
        isLegalGuardian: true,
        guardianEvidenceType: true,
        guardianEvidenceAttachmentId: true,
      },
    });

    if (!relationship) {
      throw new PatientRelationshipError("PATIENT_RELATIONSHIP_NOT_FOUND", "The patient family relationship was not found.", 404);
    }
    if (!relationship.isActive) {
      throw new PatientRelationshipError("PATIENT_RELATIONSHIP_INACTIVE", "A deactivated family relationship cannot be corrected.", 409);
    }
    if (relationship.relationshipType === input.relationshipType) {
      throw new PatientRelationshipError("PATIENT_RELATIONSHIP_NO_CHANGE", "Choose a different relationship type to record a correction.", 409);
    }

    // If a verified guardian relationship is being corrected, its evidence may
    // no longer support the corrected classification. Clear guardian status and
    // revoke any related grants; a fresh evidence-backed verification is required.
    const mustResetGuardian = relationship.isLegalGuardian;
    const updated = await transaction.patientRelationship.update({
      where: { id: relationship.id },
      data: {
        relationshipType: input.relationshipType,
        ...(mustResetGuardian ? {
          isLegalGuardian: false,
          guardianVerifiedAt: null,
          guardianVerifiedByEmployeeId: null,
          guardianEvidenceType: null,
          guardianEvidenceAttachmentId: null,
          guardianVerificationLegacy: false,
        } : {}),
      },
      select: {
        id: true,
        relationshipType: true,
        isLegalGuardian: true,
        guardianVerifiedAt: true,
        guardianEvidenceType: true,
        guardianEvidenceAttachmentId: true,
        isActive: true,
        updatedAt: true,
      },
    });

    const revoked = mustResetGuardian
      ? await transaction.patientAccessGrant.updateMany({
          where: {
            subjectPatientId: patientId,
            granteePatientId: relationship.relatedPatientId,
            status: { in: ["PENDING", "ACTIVE"] },
          },
          data: { status: "REVOKED", revokedAt: now },
        })
      : { count: 0 };

    const auditDetails = [
      `previousType=${relationship.relationshipType}`,
      `newType=${input.relationshipType}`,
      `reasonCode=${input.reasonCode}`,
      `guardianVerificationCleared=${mustResetGuardian}`,
      `revokedGrantCount=${revoked.count}`,
      relationship.guardianEvidenceType ? `previousEvidenceType=${relationship.guardianEvidenceType}` : null,
      relationship.guardianEvidenceAttachmentId ? `previousEvidenceAttachmentId=${relationship.guardianEvidenceAttachmentId}` : null,
    ].filter((value): value is string => value !== null).join("; ");

    await recordRelationshipAudit(
      transaction,
      actorEmployeeId,
      "PATIENT_FAMILY_RELATIONSHIP_CORRECTED",
      updated.id,
      auditDetails,
    );

    return { ...updated, revokedGrantCount: revoked.count };
  }, { isolationLevel: "Serializable" });
}

export async function deactivatePatientRelationship(
  patientId: string,
  relationshipId: string,
  input: DeactivatePatientRelationshipInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  const now = new Date();

  return prisma.$transaction(async (transaction: Transaction) => {
    const relationship = await transaction.patientRelationship.findFirst({
      where: { id: relationshipId, patientId },
      select: {
        id: true,
        relatedPatientId: true,
        relationshipType: true,
        isActive: true,
        isLegalGuardian: true,
        guardianEvidenceType: true,
        guardianEvidenceAttachmentId: true,
      },
    });

    if (!relationship) {
      throw new PatientRelationshipError("PATIENT_RELATIONSHIP_NOT_FOUND", "The patient family relationship was not found.", 404);
    }
    if (!relationship.isActive) {
      throw new PatientRelationshipError("PATIENT_RELATIONSHIP_ALREADY_INACTIVE", "This family relationship has already been deactivated.", 409);
    }

    const updated = await transaction.patientRelationship.update({
      where: { id: relationship.id },
      data: {
        isActive: false,
        deactivatedAt: now,
        deactivatedByEmployeeId: actorEmployeeId,
        isLegalGuardian: false,
        guardianVerifiedAt: null,
        guardianVerifiedByEmployeeId: null,
        guardianEvidenceType: null,
        guardianEvidenceAttachmentId: null,
        guardianVerificationLegacy: false,
      },
      select: {
        id: true,
        relationshipType: true,
        isActive: true,
        deactivatedAt: true,
        updatedAt: true,
      },
    });

    const revoked = await transaction.patientAccessGrant.updateMany({
      where: {
        subjectPatientId: patientId,
        granteePatientId: relationship.relatedPatientId,
        status: { in: ["PENDING", "ACTIVE"] },
      },
      data: { status: "REVOKED", revokedAt: now },
    });

    const auditDetails = [
      `relationshipType=${relationship.relationshipType}`,
      `reasonCode=${input.reasonCode}`,
      `previousGuardianVerified=${relationship.isLegalGuardian}`,
      relationship.guardianEvidenceType ? `previousEvidenceType=${relationship.guardianEvidenceType}` : null,
      relationship.guardianEvidenceAttachmentId ? `previousEvidenceAttachmentId=${relationship.guardianEvidenceAttachmentId}` : null,
      `revokedGrantCount=${revoked.count}`,
    ].filter((value): value is string => value !== null).join("; ");

    await recordRelationshipAudit(
      transaction,
      actorEmployeeId,
      "PATIENT_FAMILY_RELATIONSHIP_DEACTIVATED",
      updated.id,
      auditDetails,
    );

    return { ...updated, revokedGrantCount: revoked.count };
  }, { isolationLevel: "Serializable" });
}

export async function verifyPatientLegalGuardian(
  patientId: string,
  relationshipId: string,
  input: VerifyPatientLegalGuardianInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  const now = new Date();

  return prisma.$transaction(async (transaction: Transaction) => {
    const relationship = await transaction.patientRelationship.findFirst({
      where: { id: relationshipId, patientId },
      select: {
        id: true,
        patientId: true,
        relatedPatientId: true,
        isLegalGuardian: true,
        isActive: true,
        patient: { select: { id: true, dateOfBirth: true, isActive: true } },
        relatedPatient: { select: { id: true, isActive: true } },
      },
    });

    if (!relationship || !relationship.isActive || !relationship.patient.isActive || !relationship.relatedPatient.isActive) {
      throw new PatientRelationshipError("ACTIVE_PATIENT_RELATIONSHIP_REQUIRED", "An active relationship between active patient records is required.", 404);
    }
    if (relationship.isLegalGuardian) {
      throw new PatientRelationshipError("LEGAL_GUARDIAN_ALREADY_VERIFIED", "This relationship is already verified as legal guardianship. Revoke the previous verification before replacing its evidence.", 409);
    }
    if (!isEligibleForLegalGuardianVerification(relationship.patient.dateOfBirth, getCairoDateString(now))) {
      throw new PatientRelationshipError("MINOR_PATIENT_REQUIRED", "Legal-guardian verification in this workflow requires a valid date of birth confirming that the subject patient is under 18.", 409);
    }

    const evidence = await transaction.attachment.findFirst({
      where: {
        id: input.evidenceAttachmentId,
        patientId,
        purpose: "PATIENT_DOCUMENT",
      },
      select: { id: true },
    });
    if (!evidence) {
      throw new PatientRelationshipError("GUARDIAN_EVIDENCE_DOCUMENT_REQUIRED", "Select an existing patient document uploaded to this patient's record as legal-guardian evidence.", 409);
    }

    const updated = await transaction.patientRelationship.update({
      where: { id: relationship.id },
      data: {
        isLegalGuardian: true,
        guardianVerifiedAt: now,
        guardianVerifiedByEmployeeId: actorEmployeeId,
        guardianEvidenceType: input.evidenceType,
        guardianEvidenceAttachmentId: evidence.id,
        guardianVerificationLegacy: false,
      },
      select: {
        id: true,
        relationshipType: true,
        isLegalGuardian: true,
        guardianVerifiedAt: true,
        guardianEvidenceType: true,
        guardianEvidenceAttachmentId: true,
      },
    });

    await recordRelationshipAudit(
      transaction,
      actorEmployeeId,
      "PATIENT_LEGAL_GUARDIAN_VERIFIED",
      updated.id,
      `evidenceType=${input.evidenceType}; evidenceAttachmentId=${evidence.id}. No identity number or document contents were copied to the audit log.`,
    );

    return updated;
  }, { isolationLevel: "Serializable" });
}

export async function revokePatientLegalGuardianVerification(
  patientId: string,
  relationshipId: string,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  const now = new Date();

  return prisma.$transaction(async (transaction: Transaction) => {
    const relationship = await transaction.patientRelationship.findFirst({
      where: { id: relationshipId, patientId },
      select: {
        id: true,
        patientId: true,
        relatedPatientId: true,
        isLegalGuardian: true,
        guardianEvidenceType: true,
        guardianEvidenceAttachmentId: true,
      },
    });

    if (!relationship) {
      throw new PatientRelationshipError("PATIENT_RELATIONSHIP_NOT_FOUND", "The patient family relationship was not found.", 404);
    }
    if (!relationship.isLegalGuardian) {
      throw new PatientRelationshipError("LEGAL_GUARDIAN_NOT_VERIFIED", "This relationship does not have an active legal-guardian verification.", 409);
    }

    await transaction.patientRelationship.update({
      where: { id: relationship.id },
      data: {
        isLegalGuardian: false,
        guardianVerifiedAt: null,
        guardianVerifiedByEmployeeId: null,
        guardianEvidenceType: null,
        guardianEvidenceAttachmentId: null,
        guardianVerificationLegacy: false,
      },
    });

    const revoked = await transaction.patientAccessGrant.updateMany({
      where: {
        subjectPatientId: relationship.patientId,
        granteePatientId: relationship.relatedPatientId,
        status: { in: ["ACTIVE", "PENDING"] },
      },
      data: { status: "REVOKED", revokedAt: now },
    });

    const evidenceDetails = [
      relationship.guardianEvidenceType ? `previousEvidenceType=${relationship.guardianEvidenceType}` : null,
      relationship.guardianEvidenceAttachmentId ? `previousEvidenceAttachmentId=${relationship.guardianEvidenceAttachmentId}` : null,
      `revokedGrantCount=${revoked.count}`,
    ].filter((value): value is string => value !== null).join("; ");

    await recordRelationshipAudit(
      transaction,
      actorEmployeeId,
      "PATIENT_LEGAL_GUARDIAN_VERIFICATION_REVOKED",
      relationship.id,
      `${evidenceDetails}. Delegated access grants for this relationship were revoked and must be explicitly reissued after any future verification.`,
    );

    return {
      relationshipId: relationship.id,
      isLegalGuardian: false,
      guardianVerifiedAt: null,
      revokedGrantCount: revoked.count,
    };
  }, { isolationLevel: "Serializable" });
}
