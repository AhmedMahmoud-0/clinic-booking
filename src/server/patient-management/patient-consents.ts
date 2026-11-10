import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { getCairoDateString } from "./validation";
import { PatientContactConsentError } from "./patient-contact-consent-errors";
import {
  calculatePatientAgeAtDateOfBirth,
  canRecordPatientConsentDecision,
  resolvePatientConsentSignerType,
} from "./patient-consent-policy";
import type { PatientConsentRecordInput } from "./patient-contact-consent-validation";

type Transaction = Prisma.TransactionClient;

export async function getPatientConsentHistory(patientId: string) {
  const prisma = getPrismaClient();
  const patient = await prisma.patient.findFirst({ where: { id: patientId, isActive: true }, select: { id: true } });
  if (!patient) throw new PatientContactConsentError("ACTIVE_PATIENT_REQUIRED", "An active patient record is required.", 404);
  const events = await prisma.patientConsent.findMany({
    where: { patientId },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      consentType: true,
      decision: true,
      captureMethod: true,
      documentVersion: true,
      signerPatientId: true,
      signerType: true,
      signerNameSnapshot: true,
      recordedAt: true,
      recordedByEmployee: { select: { firstName: true, lastName: true, employeeNumber: true } },
    },
  });
  const current = new Map<string, (typeof events)[number]>();
  for (const event of events) if (!current.has(event.consentType)) current.set(event.consentType, event);
  return {
    events,
    current: [...current.values()].map((event) => ({
      consentType: event.consentType,
      decision: event.decision,
      documentVersion: event.documentVersion,
      recordedAt: event.recordedAt,
    })),
  };
}

export async function recordPatientConsent(
  patientId: string,
  input: PatientConsentRecordInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    const patient = await transaction.patient.findFirst({
      where: { id: patientId, isActive: true },
      select: { id: true, firstName: true, middleName: true, lastName: true, dateOfBirth: true },
    });
    if (!patient) throw new PatientContactConsentError("ACTIVE_PATIENT_REQUIRED", "An active patient record is required.", 404);
    const age = calculatePatientAgeAtDateOfBirth(patient.dateOfBirth, getCairoDateString(new Date()));
    if (age === null) {
      throw new PatientContactConsentError("PATIENT_DATE_OF_BIRTH_REQUIRED", "A recorded date of birth is required to validate who may sign this consent.", 409);
    }

    const signer = await transaction.patient.findFirst({
      where: { id: input.signerPatientId, isActive: true },
      select: { id: true, firstName: true, middleName: true, lastName: true },
    });
    if (!signer) throw new PatientContactConsentError("CONSENT_SIGNER_NOT_FOUND", "The consent signer must be an active patient identity.", 404);

    let hasVerifiedLegalGuardianRelationship = false;
    if (age < 18 && signer.id !== patient.id) {
      const relationship = await transaction.patientRelationship.findFirst({
        where: {
          patientId: patient.id,
          relatedPatientId: signer.id,
          isActive: true,
          isLegalGuardian: true,
          guardianVerifiedAt: { not: null },
          guardianVerifiedByEmployeeId: { not: null },
        },
        select: { id: true },
      });
      hasVerifiedLegalGuardianRelationship = Boolean(relationship);
    }

    const signerType = resolvePatientConsentSignerType({
      subjectPatientId: patient.id,
      signerPatientId: signer.id,
      age,
      hasVerifiedLegalGuardianRelationship,
    });
    if (!signerType) {
      throw new PatientContactConsentError(
        "CONSENT_SIGNER_NOT_AUTHORIZED",
        age >= 18
          ? "An adult patient must sign their own consent record."
          : "A minor patient's consent must be signed by a previously verified legal guardian.",
        403,
      );
    }

    const latest = await transaction.patientConsent.findFirst({
      where: { patientId, consentType: input.consentType },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
      select: { decision: true },
    });
    if (!canRecordPatientConsentDecision(latest?.decision ?? null, input.decision)) {
      throw new PatientContactConsentError("CONSENT_WITHDRAWAL_NOT_ALLOWED", "Consent can be withdrawn only when the latest recorded decision is granted.", 409);
    }

    const signerNameSnapshot = [signer.firstName, signer.middleName, signer.lastName].filter(Boolean).join(" ");
    const event = await transaction.patientConsent.create({
      data: {
        patientId,
        consentType: input.consentType,
        decision: input.decision,
        captureMethod: input.captureMethod,
        documentVersion: input.documentVersion,
        signerPatientId: signer.id,
        signerType,
        signerNameSnapshot,
        recordedByEmployeeId: actorEmployeeId,
      },
      select: {
        id: true,
        consentType: true,
        decision: true,
        captureMethod: true,
        documentVersion: true,
        signerPatientId: true,
        signerType: true,
        signerNameSnapshot: true,
        recordedAt: true,
      },
    });

    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: input.decision === "WITHDRAWN" ? "PATIENT_CONSENT_WITHDRAWN" : "PATIENT_CONSENT_RECORDED",
        entityType: "PatientConsent",
        entityId: event.id,
        reason: `Patient consent event recorded: ${event.consentType} / ${event.decision}. No signature image or free-text identity values were stored.`,
      },
    });

    return event;
  }, { isolationLevel: "Serializable" });
}
