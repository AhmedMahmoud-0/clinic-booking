import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { PatientDocumentError } from "./patient-document-errors";
import { deletePatientDocument, readPatientDocument, writePatientDocument } from "./patient-document-storage";
import { validatePatientDocument, type PatientDocumentFileInput } from "./patient-document-validation";

type Transaction = Prisma.TransactionClient;

function auditReason(action: "LISTED" | "UPLOADED" | "DOWNLOADED"): string {
  switch (action) {
    case "LISTED": return "Patient administrative document metadata accessed; no file content or filename recorded.";
    case "UPLOADED": return "Patient administrative document uploaded; no file content or filename recorded.";
    case "DOWNLOADED": return "Patient administrative document downloaded; no file content or filename recorded.";
  }
}

async function ensureActivePatient(transaction: Transaction, patientId: string): Promise<void> {
  const patient = await transaction.patient.findFirst({ where: { id: patientId, isActive: true }, select: { id: true } });
  if (!patient) throw new PatientDocumentError("ACTIVE_PATIENT_REQUIRED", "An active patient record is required.");
}

async function recordDocumentAudit(
  transaction: Transaction,
  actorEmployeeId: string,
  action: "LISTED" | "UPLOADED" | "DOWNLOADED",
  entityId: string,
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      actorType: "EMPLOYEE",
      actorEmployeeId,
      action: `PATIENT_DOCUMENT_${action}`,
      entityType: action === "LISTED" ? "Patient" : "Attachment",
      entityId,
      reason: auditReason(action),
    },
  });
}

export async function listPatientDocuments(patientId: string, actorEmployeeId: string) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    await ensureActivePatient(transaction, patientId);
    const documents = await transaction.attachment.findMany({
      where: { patientId, purpose: "PATIENT_DOCUMENT" },
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
      select: { id: true, originalFileName: true, mimeType: true, sizeBytes: true, uploadedAt: true, uploadedByEmployee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
    });
    await recordDocumentAudit(transaction, actorEmployeeId, "LISTED", patientId);
    return documents.map((document) => ({ ...document, sizeBytes: Number(document.sizeBytes) }));
  });
}

export async function uploadPatientDocument(
  patientId: string,
  actorEmployeeId: string,
  input: PatientDocumentFileInput,
) {
  const validated = validatePatientDocument(input);
  const storageKey = await writePatientDocument(validated.bytes);
  try {
    const prisma = getPrismaClient();
    return await prisma.$transaction(async (transaction: Transaction) => {
      await ensureActivePatient(transaction, patientId);
      const document = await transaction.attachment.create({
        data: {
          patientId,
          purpose: "PATIENT_DOCUMENT",
          originalFileName: validated.originalFileName,
          storageKey,
          mimeType: validated.mimeType,
          sizeBytes: BigInt(validated.sizeBytes),
          checksumSha256: validated.checksumSha256,
          uploadedByEmployeeId: actorEmployeeId,
        },
        select: { id: true, originalFileName: true, mimeType: true, sizeBytes: true, uploadedAt: true },
      });
      await recordDocumentAudit(transaction, actorEmployeeId, "UPLOADED", document.id);
      return { ...document, sizeBytes: Number(document.sizeBytes) };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    await deletePatientDocument(storageKey);
    throw error;
  }
}

export async function getPatientDocumentDownload(
  patientId: string,
  documentId: string,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  const document = await prisma.attachment.findFirst({
    where: { id: documentId, patientId, purpose: "PATIENT_DOCUMENT" },
    select: { id: true, originalFileName: true, storageKey: true, mimeType: true, sizeBytes: true, checksumSha256: true },
  });
  if (!document) throw new PatientDocumentError("PATIENT_DOCUMENT_NOT_FOUND", "The patient document was not found.");
  const patient = await prisma.patient.findFirst({ where: { id: patientId, isActive: true }, select: { id: true } });
  if (!patient) throw new PatientDocumentError("ACTIVE_PATIENT_REQUIRED", "An active patient record is required.");
  const bytes = await readPatientDocument(document.storageKey);
  const expectedChecksum = document.checksumSha256;
  const actualChecksum = createHash("sha256").update(bytes).digest("hex");
  if (BigInt(bytes.byteLength) !== document.sizeBytes || !expectedChecksum || actualChecksum !== expectedChecksum) {
    throw new PatientDocumentError("PATIENT_DOCUMENT_INTEGRITY_FAILED", "The stored document failed its integrity check and cannot be downloaded.");
  }

  await prisma.$transaction(async (transaction: Transaction) => {
    await recordDocumentAudit(transaction, actorEmployeeId, "DOWNLOADED", document.id);
  });

  return {
    bytes,
    fileName: document.originalFileName,
    mimeType: document.mimeType,
    sizeBytes: bytes.byteLength,
  };
}
