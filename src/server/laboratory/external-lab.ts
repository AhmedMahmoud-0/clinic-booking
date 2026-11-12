import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { verifyPatientIdentityMatch, type PatientIdentityVerificationRecord } from "../patient-management/identity-verification-validation";
import { decideDiagnosticPatientConversion, decideExternalLabReferralTransition } from "./external-lab-policy";
import type {
  ExternalLabCancelRequest,
  ExternalLabIntakeRequest,
  ExternalLabReferralRequest,
  ExternalLabResultRequest,
  ExternalLabReviewRequest,
  PatientRecordConversionRequest,
} from "./external-lab-validation";

export class ExternalLabError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ExternalLabError";
    this.code = code;
    this.status = status;
  }
}

type Tx = Prisma.TransactionClient;
function fail(code: string, message: string, status: number): never { throw new ExternalLabError(code, message, status); }
const reference = (prefix: string) => `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;

async function employeeRoles(tx: Tx, employeeId: string) {
  const employee = await tx.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, status: true, roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } }, doctorProfile: { select: { id: true } } },
  });
  if (!employee || employee.status !== "ACTIVE") fail("EXTERNAL_LAB_EMPLOYEE_REQUIRED", "An active employee session is required.", 403);
  return employee;
}
async function requireRoles(tx: Tx, employeeId: string, roles: string[]) {
  const employee = await employeeRoles(tx, employeeId);
  if (!employee.roleAssignments.some((assignment) => roles.includes(assignment.role))) {
    fail("EXTERNAL_LAB_WORKSPACE_ACCESS_REQUIRED", "The employee does not have access to this external laboratory action.", 403);
  }
  return employee;
}
async function audit(tx: Tx, employeeId: string, action: string, entityType: string, entityId: string, reason?: string) {
  await tx.auditLog.create({ data: { actorType: "EMPLOYEE", actorEmployeeId: employeeId, action, entityType, entityId, reason: reason ?? null } });
}

export async function createExternalLabIntake(employeeId: string, request: ExternalLabIntakeRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRoles(tx, employeeId, ["RECEPTION"]);
    const tests = await tx.labTest.findMany({ where: { id: { in: request.labTestIds }, isActive: true }, select: { id: true, name: true, price: true, currencyCode: true } });
    if (tests.length !== request.labTestIds.length) fail("EXTERNAL_LAB_TEST_UNAVAILABLE", "One or more selected laboratory tests are unavailable.", 409);

    let patientId: string;
    let patientRecordType: "FULL" | "DIAGNOSTIC_ONLY";
    if (request.patientMode === "EXISTING") {
      const patient = await tx.patient.findFirst({
        where: { id: request.existingPatientId, isActive: true },
        select: { id: true, mrn: true, recordType: true, firstName: true, middleName: true, lastName: true, dateOfBirth: true, contacts: { where: { type: "PHONE", isActive: true }, select: { normalizedValue: true } } },
      });
      if (!patient) fail("EXTERNAL_LAB_PATIENT_NOT_FOUND", "The existing patient record was not found.", 404);
      const verified = verifyPatientIdentityMatch(patient as PatientIdentityVerificationRecord, request.identityVerification);
      const now = new Date();
      const identity = await tx.identityVerification.create({
        data: {
          patientId: patient.id,
          firstElement: request.identityVerification.firstIdentifier.type,
          secondElement: request.identityVerification.secondIdentifier.type,
          result: verified ? "VERIFIED" : "FAILED",
          performedByEmployeeId: employeeId,
          verifiedAt: now,
          notes: "Two distinct stored patient identity elements were compared. Submitted values are not retained.",
        },
        select: { id: true },
      });
      await audit(tx, employeeId, verified ? "PATIENT_IDENTITY_VERIFIED" : "PATIENT_IDENTITY_VERIFICATION_FAILED", "IdentityVerification", identity.id,
        verified ? "Two distinct patient identity elements matched. Submitted values were not retained." : "Two patient identity elements did not both match. No external laboratory intake was created.");
      if (!verified) return { identityVerified: false as const, identityVerification: "FAILED" as const, verificationId: identity.id, intake: null, order: null, patientId: patient.id, patientRecordType: patient.recordType };
      patientId = patient.id;
      patientRecordType = patient.recordType;
    } else {
      const patient = request.patient;
      if (!patient) fail("EXTERNAL_LAB_PATIENT_DETAILS_REQUIRED", "New diagnostic-only patient details are required.", 400);
      const created = await tx.patient.create({
        data: {
          mrn: reference("DX"),
          recordType: "DIAGNOSTIC_ONLY",
          firstName: patient.firstName,
          middleName: patient.middleName ?? null,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth ? new Date(`${patient.dateOfBirth}T00:00:00.000Z`) : null,
          gender: patient.gender ?? null,
          contacts: patient.phone ? { create: [{ type: "PHONE", value: patient.phone, normalizedValue: patient.phone.replace(/\D/g, ""), isPrimary: true }] } : undefined,
        },
        select: { id: true, mrn: true, recordType: true },
      });
      patientId = created.id;
      patientRecordType = created.recordType;
    }

    const intake = await tx.externalLabIntake.create({
      data: {
        intakeReference: reference("EXTL"),
        patientId,
        requestSource: request.requestSource,
        referringProviderName: request.referringProviderName,
        referringFacilityName: request.referringFacilityName,
        referringProviderContact: request.referringProviderContact ?? null,
        externalRequestReference: request.externalRequestReference ?? null,
        requestNotes: request.requestNotes ?? null,
        createdByEmployeeId: employeeId,
      },
      select: { id: true, intakeReference: true, patientId: true, createdAt: true },
    });
    const order = await tx.labOrder.create({
      data: {
        orderReference: reference("LABX"),
        externalIntakeId: intake.id,
        priority: request.priority,
        clinicalNotes: "External diagnostic intake. Referring provider and facility details are recorded on the intake.",
        items: { create: tests.map((test) => ({ labTestId: test.id, priceSnapshot: test.price, currencyCode: test.currencyCode })) },
      },
      select: { id: true, orderReference: true, priority: true, items: { select: { id: true, labTest: { select: { code: true, name: true } } } } },
    });
    await audit(tx, employeeId, "EXTERNAL_LAB_INTAKE_CREATED", "ExternalLabIntake", intake.id, "An external-provider diagnostic intake was created without opening a clinic Encounter.");
    return {
      identityVerified: request.patientMode === "NEW" ? null : true,
      identityVerification: request.patientMode === "NEW" ? "NOT_REQUIRED_FOR_NEW_DIAGNOSTIC_RECORD" as const : "VERIFIED" as const,
      intake, order, patientId,
      patientRecordType,
    };
  }, { isolationLevel: "Serializable" });
}

export async function createExternalLabReferral(encounterId: string, employeeId: string, request: ExternalLabReferralRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRoles(tx, employeeId, ["DOCTOR"]);
    if (!employee.doctorProfile) fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
    const encounter = await tx.encounter.findFirst({ where: { id: encounterId, doctorId: employee.doctorProfile.id, status: "IN_PROGRESS" }, select: { id: true, patientId: true } });
    if (!encounter) fail("EXTERNAL_LAB_ENCOUNTER_NOT_FOUND", "The active Encounter assigned to this Doctor was not found.", 404);
    if (request.consent.signerPatientId !== encounter.patientId) {
      const guardian = await tx.patientRelationship.findFirst({
        where: { patientId: encounter.patientId, relatedPatientId: request.consent.signerPatientId, isActive: true, isLegalGuardian: true, guardianVerifiedAt: { not: null }, guardianEvidenceType: { not: null } },
        select: { id: true },
      });
      if (request.consent.signerType !== "LEGAL_GUARDIAN" || !guardian) fail("EXTERNAL_LAB_GUARDIAN_NOT_VERIFIED", "A verified legal-guardian relationship is required for guardian consent.", 403);
    } else if (request.consent.signerType !== "PATIENT") {
      fail("EXTERNAL_LAB_CONSENT_SIGNER_INVALID", "The patient must be recorded as the consent signer.", 400);
    }
    const consent = await tx.patientConsent.create({
      data: {
        patientId: encounter.patientId,
        consentType: "EXTERNAL_DIAGNOSTIC_DATA_SHARING",
        decision: "GRANTED",
        captureMethod: request.consent.captureMethod,
        documentVersion: request.consent.documentVersion,
        signerPatientId: request.consent.signerPatientId,
        signerType: request.consent.signerType,
        signerNameSnapshot: request.consent.signerNameSnapshot,
        recordedByEmployeeId: employeeId,
      },
      select: { id: true },
    });
    const referral = await tx.externalLabReferral.create({
      data: {
        referralReference: reference("ELR"), encounterId, testName: request.testName, reason: request.reason,
        externalFacilityName: request.externalFacilityName, externalFacilityContact: request.externalFacilityContact ?? null,
        consentId: consent.id, createdByEmployeeId: employeeId,
      },
      select: { id: true, referralReference: true, status: true, referredAt: true },
    });
    await audit(tx, employeeId, "EXTERNAL_LAB_REFERRAL_CREATED", "ExternalLabReferral", referral.id, "Referral created with granted, scoped external diagnostic data-sharing consent.");
    return { ...referral, referredAt: referral.referredAt.toISOString() };
  }, { isolationLevel: "Serializable" });
}


export async function getExternalLabReferralWorklist(employeeId: string) {
  const prisma = getPrismaClient();
  await prisma.$transaction(async (tx) => { await requireRoles(tx, employeeId, ["LAB_STAFF"]); });
  const referrals = await prisma.externalLabReferral.findMany({
    where: { status: "REFERRED" },
    orderBy: [{ referredAt: "asc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, referralReference: true, testName: true, reason: true,
      externalFacilityName: true, externalFacilityContact: true, referredAt: true,
      encounter: { select: { patient: { select: { mrn: true, firstName: true, lastName: true } } } },
    },
  });
  return {
    items: referrals.map((referral) => ({
      id: referral.id, referralReference: referral.referralReference, testName: referral.testName,
      reason: referral.reason, externalFacilityName: referral.externalFacilityName,
      externalFacilityContact: referral.externalFacilityContact, referredAt: referral.referredAt.toISOString(),
      patient: { mrn: referral.encounter.patient.mrn, displayName: `${referral.encounter.patient.firstName} ${referral.encounter.patient.lastName}` },
    })),
    limit: 100,
  };
}

export async function listEncounterExternalLabReferrals(encounterId: string, employeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRoles(tx, employeeId, ["DOCTOR"]);
    if (!employee.doctorProfile) fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
    const encounter = await tx.encounter.findFirst({ where: { id: encounterId, doctorId: employee.doctorProfile.id }, select: { id: true } });
    if (!encounter) fail("EXTERNAL_LAB_ENCOUNTER_NOT_FOUND", "The Encounter was not found for this Doctor.", 404);
    const items = await tx.externalLabReferral.findMany({
      where: { encounterId }, orderBy: [{ referredAt: "desc" }, { id: "desc" }], take: 100,
      select: { id: true, referralReference: true, status: true, testName: true, reason: true, externalFacilityName: true, referredAt: true, resultSummary: true, resultReceivedAt: true, reviewNotes: true, reviewedAt: true },
    });
    return { items: items.map((item) => ({ ...item, referredAt: item.referredAt.toISOString(), resultReceivedAt: item.resultReceivedAt?.toISOString() ?? null, reviewedAt: item.reviewedAt?.toISOString() ?? null })) };
  });
}

async function lockReferral(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ExternalLabReferral" WHERE "id" = ${id} FOR UPDATE`;
  if (rows.length !== 1) fail("EXTERNAL_LAB_REFERRAL_NOT_FOUND", "The external laboratory referral was not found.", 404);
}

export async function receiveExternalLabResult(referralId: string, employeeId: string, request: ExternalLabResultRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRoles(tx, employeeId, ["LAB_STAFF"]);
    await lockReferral(tx, referralId);
    const referral = await tx.externalLabReferral.findUnique({ where: { id: referralId }, select: { id: true, status: true } });
    if (!referral) fail("EXTERNAL_LAB_REFERRAL_NOT_FOUND", "The external laboratory referral was not found.", 404);
    const transition = decideExternalLabReferralTransition({ status: referral.status, action: "RECEIVE_RESULT" });
    if (transition.kind === "REJECT") fail(transition.code, "Only a referred external test can receive a result.", 409);
    const now = new Date();
    const updated = await tx.externalLabReferral.update({ where: { id: referralId }, data: { status: "RESULT_RECEIVED", resultSummary: request.resultSummary, resultReceivedAt: now, resultReceivedByEmployeeId: employeeId }, select: { id: true, status: true, resultReceivedAt: true } });
    await audit(tx, employeeId, "EXTERNAL_LAB_RESULT_RECEIVED", "ExternalLabReferral", referralId, "External provider result summary recorded. This action does not upload a binary report file.");
    return { ...updated, resultReceivedAt: updated.resultReceivedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function reviewExternalLabResult(referralId: string, employeeId: string, request: ExternalLabReviewRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRoles(tx, employeeId, ["DOCTOR"]);
    if (!employee.doctorProfile) fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
    await lockReferral(tx, referralId);
    const referral = await tx.externalLabReferral.findUnique({ where: { id: referralId }, select: { id: true, status: true, encounter: { select: { doctorId: true } } } });
    if (!referral || referral.encounter.doctorId !== employee.doctorProfile.id) fail("EXTERNAL_LAB_REFERRAL_NOT_FOUND", "The referral was not found for this Doctor.", 404);
    const transition = decideExternalLabReferralTransition({ status: referral.status, action: "REVIEW_RESULT" });
    if (transition.kind === "REJECT") fail(transition.code, "Only a received external laboratory result can be reviewed.", 409);
    const now = new Date();
    const updated = await tx.externalLabReferral.update({ where: { id: referralId }, data: { status: "REVIEWED", reviewedByEmployeeId: employeeId, reviewedAt: now, reviewNotes: request.reviewNotes }, select: { id: true, status: true, reviewedAt: true, reviewNotes: true } });
    await audit(tx, employeeId, "EXTERNAL_LAB_RESULT_REVIEWED", "ExternalLabReferral", referralId, "Assigned Doctor reviewed the externally issued result summary.");
    return { ...updated, reviewedAt: updated.reviewedAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function cancelExternalLabReferral(referralId: string, employeeId: string, request: ExternalLabCancelRequest) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const employee = await requireRoles(tx, employeeId, ["DOCTOR"]);
    if (!employee.doctorProfile) fail("DOCTOR_WORKSPACE_ACCESS_REQUIRED", "An active Doctor profile is required.", 403);
    await lockReferral(tx, referralId);
    const referral = await tx.externalLabReferral.findUnique({ where: { id: referralId }, select: { id: true, status: true, encounter: { select: { doctorId: true } } } });
    if (!referral || referral.encounter.doctorId !== employee.doctorProfile.id) fail("EXTERNAL_LAB_REFERRAL_NOT_FOUND", "The referral was not found for this Doctor.", 404);
    const transition = decideExternalLabReferralTransition({ status: referral.status, action: "CANCEL" });
    if (transition.kind === "REJECT") fail(transition.code, "Only a referral without a received result can be cancelled.", 409);
    const now = new Date();
    const updated = await tx.externalLabReferral.update({ where: { id: referralId }, data: { status: "CANCELLED", cancelledAt: now, cancelledByEmployeeId: employeeId, cancellationReason: request.reason }, select: { id: true, status: true, cancelledAt: true, cancellationReason: true } });
    await audit(tx, employeeId, "EXTERNAL_LAB_REFERRAL_CANCELLED", "ExternalLabReferral", referralId, request.reason);
    return { ...updated, cancelledAt: updated.cancelledAt?.toISOString() ?? null };
  }, { isolationLevel: "Serializable" });
}

export async function convertDiagnosticPatientToFullRecord(patientId: string, employeeId: string, request: PatientRecordConversionRequest & { identityVerification: { firstIdentifier: { type: "FULL_NAME" | "DATE_OF_BIRTH" | "PHONE" | "MRN"; value: string }; secondIdentifier: { type: "FULL_NAME" | "DATE_OF_BIRTH" | "PHONE" | "MRN"; value: string } } }) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await requireRoles(tx, employeeId, ["RECEPTION"]);
    const patient = await tx.patient.findFirst({ where: { id: patientId, isActive: true }, select: { id: true, recordType: true, mrn: true, firstName: true, middleName: true, lastName: true, dateOfBirth: true, contacts: { where: { type: "PHONE", isActive: true }, select: { normalizedValue: true } } } });
    if (!patient) fail("PATIENT_NOT_FOUND", "The active patient record was not found.", 404);
    const verified = verifyPatientIdentityMatch(patient as PatientIdentityVerificationRecord, request.identityVerification);
    const conversionDecision = decideDiagnosticPatientConversion({ recordType: patient.recordType, identityVerified: verified });
    if (conversionDecision.kind === "REJECT" && conversionDecision.code === "PATIENT_RECORD_NOT_DIAGNOSTIC_ONLY") fail(conversionDecision.code, "Only a diagnostic-only patient record can be converted.", 409);
    const now = new Date();
    const verification = await tx.identityVerification.create({ data: {
      patientId, firstElement: request.identityVerification.firstIdentifier.type, secondElement: request.identityVerification.secondIdentifier.type,
      result: verified ? "VERIFIED" : "FAILED", performedByEmployeeId: employeeId, verifiedAt: now,
      notes: "Identity was re-verified before diagnostic-only record conversion. Submitted values are not retained.",
    }, select: { id: true } });
    await audit(tx, employeeId, verified ? "PATIENT_IDENTITY_VERIFIED" : "PATIENT_IDENTITY_VERIFICATION_FAILED", "IdentityVerification", verification.id, "Diagnostic-only record conversion identity check; submitted values are not retained.");
    if (conversionDecision.kind === "REJECT") return { converted: false as const, identityVerified: false as const };
    await tx.patient.update({ where: { id: patientId }, data: { recordType: "FULL" } });
    await tx.patientRecordTypeHistory.create({ data: { patientId, fromType: "DIAGNOSTIC_ONLY", toType: "FULL", changedByEmployeeId: employeeId, reason: request.reason } });
    await audit(tx, employeeId, "PATIENT_RECORD_CONVERTED_TO_FULL", "Patient", patientId, request.reason);
    return { converted: true as const, identityVerified: true as const, patientId, recordType: "FULL" as const };
  }, { isolationLevel: "Serializable" });
}

export function mapExternalLabError(error: unknown): unknown {
  if (error instanceof ExternalLabError) return error;
  if (typeof error === "object" && error !== null && "code" in error && (error.code === "P2002" || error.code === "P2034")) {
    return new ExternalLabError("EXTERNAL_LAB_CONFLICT", "Another external laboratory operation changed this record. Refresh and try again.", 409);
  }
  return error;
}
