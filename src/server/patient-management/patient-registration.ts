import "server-only";

import { randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";

import { getPrismaClient } from "../db/client";
import { PatientManagementError } from "./errors";
import {
  getCairoDateString,
  getPatientPhoneLookupValues,
  normalizePatientPhone,
  toPatientDuplicateCandidate,
  type CreatePatientInput,
  type PatientDuplicateCandidate,
  type PatientDuplicateCheckInput,
  type PatientDuplicateComparable,
} from "./validation";

type PatientReader = Pick<Prisma.TransactionClient, "patient">;

function generateMedicalRecordNumber(now = new Date()): string {
  const year = getCairoDateString(now).slice(0, 4);
  const suffix = randomBytes(6).toString("hex").toUpperCase();
  return `MRN-${year}-${suffix}`;
}

async function findPatientDuplicateCandidates(
  reader: PatientReader,
  input: PatientDuplicateCheckInput,
): Promise<PatientDuplicateCandidate[]> {
  const selectedPatient = {
    id: true,
    mrn: true,
    isActive: true,
    firstName: true,
    middleName: true,
    lastName: true,
    dateOfBirth: true,
    contacts: {
      where: { type: "PHONE" as const },
      select: { normalizedValue: true },
    },
  };
  const exactNameWhere: Prisma.PatientWhereInput = {
    firstName: { equals: input.firstName, mode: "insensitive" },
    lastName: { equals: input.lastName, mode: "insensitive" },
  };
  const fullNameWhere: Prisma.PatientWhereInput = {
    ...exactNameWhere,
    middleName: input.middleName?.trim()
      ? { equals: input.middleName.trim(), mode: "insensitive" }
      : null,
  };
  const phoneWhere: Prisma.PatientWhereInput = {
    contacts: {
      some: {
        type: "PHONE",
        normalizedValue: { in: getPatientPhoneLookupValues(input.phone) },
      },
    },
  };
  const highConfidenceWhere: Prisma.PatientWhereInput | null = input.dateOfBirth
    ? {
        ...fullNameWhere,
        dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
      }
    : null;

  const [namePatients, phonePatients, highConfidencePatients] = await Promise.all([
    reader.patient.findMany({
      where: exactNameWhere,
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      select: selectedPatient,
    }),
    reader.patient.findMany({
      where: phoneWhere,
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      select: selectedPatient,
    }),
    highConfidenceWhere
      ? reader.patient.findMany({
          where: highConfidenceWhere,
          orderBy: [{ createdAt: "desc" }],
          take: 20,
          select: selectedPatient,
        })
      : Promise.resolve([]),
  ]);

  const uniquePatients = new Map<string, (typeof namePatients)[number]>();
  for (const patient of [...namePatients, ...phonePatients, ...highConfidencePatients]) {
    uniquePatients.set(patient.id, patient);
  }

  return [...uniquePatients.values()]
    .map((patient) =>
      toPatientDuplicateCandidate(input, patient as PatientDuplicateComparable),
    )
    .filter((candidate): candidate is PatientDuplicateCandidate => candidate !== null)
    .sort((left, right) => {
      if (left.confidence !== right.confidence) return left.confidence === "HIGH" ? -1 : 1;
      return right.matchedIdentifiers.length - left.matchedIdentifiers.length;
    });
}

/** Search only demographic/contact signals; never returns contact values or clinical data. */
export async function checkPatientDuplicates(input: PatientDuplicateCheckInput) {
  const prisma = getPrismaClient();
  const candidates = await findPatientDuplicateCandidates(prisma, input);
  return {
    candidates: candidates.slice(0, 20),
    truncated: candidates.length > 20,
  };
}

/**
 * Create a patient only after a serializable duplicate re-check and a two-element
 * identity attestation by the authorized reception employee. Raw document values
 * are never collected in this workflow or written to identity/audit notes.
 */
export async function registerPatient(
  input: CreatePatientInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  return prisma.$transaction(
    async (transaction) => {
      const duplicateCandidates = await findPatientDuplicateCandidates(transaction, input);
      const highConfidenceCandidates = duplicateCandidates.filter(
        (candidate) => candidate.confidence === "HIGH",
      );
      const reviewCandidates = duplicateCandidates.filter(
        (candidate) => candidate.confidence === "REVIEW",
      );

      if (highConfidenceCandidates.length > 0) {
        throw new PatientManagementError(
          "POTENTIAL_DUPLICATE_PATIENT",
          "Two or more independent identity elements match an existing patient. Use the existing record or escalate the case; a second record was not created.",
          409,
          duplicateCandidates.slice(0, 20),
        );
      }

      if (reviewCandidates.length > 0 && !input.duplicateReviewAcknowledged) {
        throw new PatientManagementError(
          "DUPLICATE_REVIEW_REQUIRED",
          "One or more possible matches were found. Review them before confirming that this is a different patient.",
          409,
          duplicateCandidates.slice(0, 20),
        );
      }

      const phone = input.phone.trim();
      const normalizedPhone = normalizePatientPhone(phone);
      const email = input.email?.trim().toLowerCase() ?? null;
      const created = await transaction.patient.create({
        data: {
          mrn: generateMedicalRecordNumber(),
          firstName: input.firstName,
          middleName: input.middleName?.trim() || null,
          lastName: input.lastName,
          preferredName: input.preferredName?.trim() || null,
          dateOfBirth: input.dateOfBirth
            ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
            : null,
          gender: input.gender ?? null,
          contacts: {
            create: [
              {
                type: "PHONE" as const,
                value: phone,
                normalizedValue: normalizedPhone,
                isPrimary: true,
              },
              ...(email
                ? [
                    {
                      type: "EMAIL" as const,
                      value: email,
                      normalizedValue: email,
                      isPrimary: true,
                    },
                  ]
                : []),
            ],
          },
        },
        select: {
          id: true,
          mrn: true,
          firstName: true,
          middleName: true,
          lastName: true,
          preferredName: true,
          dateOfBirth: true,
          gender: true,
          isActive: true,
          createdAt: true,
          contacts: {
            select: {
              id: true,
              type: true,
              value: true,
              isPrimary: true,
              verifiedAt: true,
            },
            orderBy: [{ type: "asc" }],
          },
        },
      });

      await transaction.identityVerification.create({
        data: {
          patientId: created.id,
          firstElement: input.identityElements[0],
          secondElement: input.identityElements[1],
          result: "VERIFIED",
          performedByEmployeeId: actorEmployeeId,
          notes: "Two identity elements were checked during patient registration. Raw identifier values are not stored.",
        },
      });

      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "PATIENT_REGISTERED",
          entityType: "Patient",
          entityId: created.id,
          reason: "New patient record created after a two-element identity check.",
        },
      });

      if (reviewCandidates.length > 0) {
        await transaction.auditLog.create({
          data: {
            actorType: "EMPLOYEE",
            actorEmployeeId,
            action: "PATIENT_DUPLICATE_CANDIDATES_REVIEWED",
            entityType: "Patient",
            entityId: created.id,
            reason: "Reception reviewed low-confidence duplicate candidates and confirmed this is a distinct patient record.",
          },
        });
      }

      return {
        patient: {
          ...created,
          dateOfBirth: created.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        },
        identityVerification: {
          result: "VERIFIED" as const,
          elements: input.identityElements,
        },
        reviewedDuplicateCandidateCount: reviewCandidates.length,
      };
    },
    { isolationLevel: "Serializable" },
  );
}
