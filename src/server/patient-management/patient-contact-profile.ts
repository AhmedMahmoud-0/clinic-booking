import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { getPrismaClient } from "../db/client";
import { getPatientPhoneMatchKey, normalizePatientPhone } from "./validation";
import { PatientContactConsentError } from "./patient-contact-consent-errors";
import type { PatientContactProfileCommand } from "./patient-contact-consent-validation";

type Transaction = Prisma.TransactionClient;

function auditReason(action: string): string {
  const descriptions: Record<string, string> = {
    ADD_CONTACT: "Patient contact method added or reactivated.",
    SET_PRIMARY_CONTACT: "Patient primary contact method changed.",
    DEACTIVATE_CONTACT: "Patient contact method deactivated; historical value retained.",
    ADD_ADDRESS: "Patient address added.",
    SET_PRIMARY_ADDRESS: "Patient primary address changed.",
    DEACTIVATE_ADDRESS: "Patient address deactivated; historical value retained.",
    ADD_EMERGENCY_CONTACT: "Patient emergency contact added.",
    SET_PRIMARY_EMERGENCY_CONTACT: "Patient primary emergency contact changed.",
    DEACTIVATE_EMERGENCY_CONTACT: "Patient emergency contact deactivated; historical value retained.",
  };
  return descriptions[action] ?? "Patient contact profile updated.";
}

async function ensureActivePatient(transaction: Transaction, patientId: string): Promise<void> {
  const patient = await transaction.patient.findFirst({
    where: { id: patientId, isActive: true },
    select: { id: true },
  });
  if (!patient) {
    throw new PatientContactConsentError("ACTIVE_PATIENT_REQUIRED", "An active patient record is required.", 404);
  }
}

async function recordAudit(
  transaction: Transaction,
  actorEmployeeId: string,
  entityType: string,
  entityId: string,
  action: string,
): Promise<void> {
  await transaction.auditLog.create({
    data: {
      actorType: "EMPLOYEE",
      actorEmployeeId,
      action,
      entityType,
      entityId,
      reason: auditReason(action),
    },
  });
}

export async function getPatientContactProfile(patientId: string) {
  const prisma = getPrismaClient();
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, isActive: true },
    select: {
      id: true,
      mrn: true,
      contacts: {
        orderBy: [{ type: "asc" }, { isPrimary: "desc" }, { createdAt: "desc" }],
        select: { id: true, type: true, value: true, isPrimary: true, isActive: true, verifiedAt: true, createdAt: true, updatedAt: true },
      },
      addresses: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: { id: true, type: true, addressLine1: true, addressLine2: true, district: true, city: true, governorate: true, postalCode: true, countryCode: true, isPrimary: true, isActive: true, createdAt: true, updatedAt: true },
      },
      emergencyContacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: { id: true, fullName: true, relationshipType: true, phone: true, isPrimary: true, isActive: true, createdAt: true, updatedAt: true },
      },
    },
  });
  if (!patient) {
    throw new PatientContactConsentError("ACTIVE_PATIENT_REQUIRED", "An active patient record is required.", 404);
  }
  return patient;
}

export async function applyPatientContactProfileCommand(
  patientId: string,
  input: PatientContactProfileCommand,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (transaction: Transaction) => {
    await ensureActivePatient(transaction, patientId);
    let entityType = "PatientContact";
    let entityId = patientId;

    switch (input.action) {
      case "ADD_CONTACT": {
        const normalizedValue = input.type === "PHONE"
          ? normalizePatientPhone(input.value)
          : input.value.trim().toLowerCase();

        let existing: { id: string; isActive: boolean } | null = null;
        if (input.type === "PHONE") {
          const contacts = await transaction.patientContact.findMany({
            where: { patientId, type: "PHONE" },
            select: { id: true, normalizedValue: true, isActive: true },
          });
          const matchKey = getPatientPhoneMatchKey(input.value);
          const match = contacts.find((contact) => getPatientPhoneMatchKey(contact.normalizedValue) === matchKey);
          existing = match ? { id: match.id, isActive: match.isActive } : null;
        } else {
          const match = await transaction.patientContact.findUnique({
            where: { patientId_type_normalizedValue: { patientId, type: "EMAIL", normalizedValue } },
            select: { id: true, isActive: true },
          });
          existing = match;
        }

        if (existing?.isActive) {
          throw new PatientContactConsentError("PATIENT_CONTACT_ALREADY_EXISTS", "This contact method is already recorded for the patient.", 409);
        }
        if (input.isPrimary) {
          await transaction.patientContact.updateMany({ where: { patientId, type: input.type, isPrimary: true }, data: { isPrimary: false } });
        }
        const contact = existing
          ? await transaction.patientContact.update({
              where: { id: existing.id },
              data: { value: input.type === "EMAIL" ? normalizedValue : input.value.trim(), isActive: true, isPrimary: input.isPrimary, verifiedAt: null },
              select: { id: true, type: true, value: true, isPrimary: true, isActive: true, verifiedAt: true },
            })
          : await transaction.patientContact.create({
              data: { patientId, type: input.type, value: input.type === "EMAIL" ? normalizedValue : input.value.trim(), normalizedValue, isPrimary: input.isPrimary },
              select: { id: true, type: true, value: true, isPrimary: true, isActive: true, verifiedAt: true },
            });
        entityId = contact.id;
        await recordAudit(transaction, actorEmployeeId, "PatientContact", entityId, input.action);
        return { kind: "CONTACT" as const, record: contact };
      }
      case "SET_PRIMARY_CONTACT": {
        const contact = await transaction.patientContact.findFirst({ where: { id: input.contactId, patientId, isActive: true }, select: { id: true, type: true } });
        if (!contact) throw new PatientContactConsentError("PATIENT_CONTACT_NOT_FOUND", "The active patient contact was not found.", 404);
        await transaction.patientContact.updateMany({ where: { patientId, type: contact.type, isPrimary: true }, data: { isPrimary: false } });
        const updated = await transaction.patientContact.update({ where: { id: contact.id }, data: { isPrimary: true }, select: { id: true, type: true, value: true, isPrimary: true, isActive: true, verifiedAt: true } });
        entityType = "PatientContact"; entityId = updated.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "CONTACT" as const, record: updated };
      }
      case "DEACTIVATE_CONTACT": {
        const contact = await transaction.patientContact.findFirst({ where: { id: input.contactId, patientId, isActive: true }, select: { id: true } });
        if (!contact) throw new PatientContactConsentError("PATIENT_CONTACT_NOT_FOUND", "The active patient contact was not found.", 404);
        const updated = await transaction.patientContact.update({ where: { id: contact.id }, data: { isActive: false, isPrimary: false }, select: { id: true, type: true, isActive: true, isPrimary: true } });
        entityType = "PatientContact"; entityId = updated.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "CONTACT" as const, record: updated };
      }
      case "ADD_ADDRESS": {
        if (input.isPrimary) await transaction.patientAddress.updateMany({ where: { patientId, isActive: true, isPrimary: true }, data: { isPrimary: false } });
        const address = await transaction.patientAddress.create({
          data: { patientId, type: input.type, addressLine1: input.addressLine1, addressLine2: input.addressLine2 ?? null, district: input.district ?? null, city: input.city, governorate: input.governorate, postalCode: input.postalCode ?? null, countryCode: input.countryCode, isPrimary: input.isPrimary, isActive: true },
          select: { id: true, type: true, addressLine1: true, addressLine2: true, district: true, city: true, governorate: true, postalCode: true, countryCode: true, isPrimary: true, isActive: true },
        });
        entityType = "PatientAddress"; entityId = address.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "ADDRESS" as const, record: address };
      }
      case "SET_PRIMARY_ADDRESS": {
        const address = await transaction.patientAddress.findFirst({ where: { id: input.addressId, patientId, isActive: true }, select: { id: true } });
        if (!address) throw new PatientContactConsentError("PATIENT_ADDRESS_NOT_FOUND", "The active patient address was not found.", 404);
        await transaction.patientAddress.updateMany({ where: { patientId, isActive: true, isPrimary: true }, data: { isPrimary: false } });
        const updated = await transaction.patientAddress.update({ where: { id: address.id }, data: { isPrimary: true }, select: { id: true, type: true, addressLine1: true, addressLine2: true, district: true, city: true, governorate: true, postalCode: true, countryCode: true, isPrimary: true, isActive: true } });
        entityType = "PatientAddress"; entityId = updated.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "ADDRESS" as const, record: updated };
      }
      case "DEACTIVATE_ADDRESS": {
        const address = await transaction.patientAddress.findFirst({ where: { id: input.addressId, patientId, isActive: true }, select: { id: true } });
        if (!address) throw new PatientContactConsentError("PATIENT_ADDRESS_NOT_FOUND", "The active patient address was not found.", 404);
        const updated = await transaction.patientAddress.update({ where: { id: address.id }, data: { isActive: false, isPrimary: false }, select: { id: true, isActive: true, isPrimary: true } });
        entityType = "PatientAddress"; entityId = updated.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "ADDRESS" as const, record: updated };
      }
      case "ADD_EMERGENCY_CONTACT": {
        const normalizedPhone = normalizePatientPhone(input.phone);
        const existingContacts = await transaction.patientEmergencyContact.findMany({ where: { patientId, isActive: true }, select: { normalizedPhone: true } });
        const matchKey = getPatientPhoneMatchKey(input.phone);
        if (existingContacts.some((contact) => getPatientPhoneMatchKey(contact.normalizedPhone) === matchKey)) {
          throw new PatientContactConsentError("EMERGENCY_CONTACT_ALREADY_EXISTS", "This emergency phone number is already recorded for the patient.", 409);
        }
        if (input.isPrimary) await transaction.patientEmergencyContact.updateMany({ where: { patientId, isActive: true, isPrimary: true }, data: { isPrimary: false } });
        const contact = await transaction.patientEmergencyContact.create({
          data: { patientId, fullName: input.fullName, relationshipType: input.relationshipType, phone: input.phone.trim(), normalizedPhone, isPrimary: input.isPrimary },
          select: { id: true, fullName: true, relationshipType: true, phone: true, isPrimary: true, isActive: true },
        });
        entityType = "PatientEmergencyContact"; entityId = contact.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "EMERGENCY_CONTACT" as const, record: contact };
      }
      case "SET_PRIMARY_EMERGENCY_CONTACT": {
        const contact = await transaction.patientEmergencyContact.findFirst({ where: { id: input.emergencyContactId, patientId, isActive: true }, select: { id: true } });
        if (!contact) throw new PatientContactConsentError("PATIENT_EMERGENCY_CONTACT_NOT_FOUND", "The active emergency contact was not found.", 404);
        await transaction.patientEmergencyContact.updateMany({ where: { patientId, isActive: true, isPrimary: true }, data: { isPrimary: false } });
        const updated = await transaction.patientEmergencyContact.update({ where: { id: contact.id }, data: { isPrimary: true }, select: { id: true, fullName: true, relationshipType: true, phone: true, isPrimary: true, isActive: true } });
        entityType = "PatientEmergencyContact"; entityId = updated.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "EMERGENCY_CONTACT" as const, record: updated };
      }
      case "DEACTIVATE_EMERGENCY_CONTACT": {
        const contact = await transaction.patientEmergencyContact.findFirst({ where: { id: input.emergencyContactId, patientId, isActive: true }, select: { id: true } });
        if (!contact) throw new PatientContactConsentError("PATIENT_EMERGENCY_CONTACT_NOT_FOUND", "The active emergency contact was not found.", 404);
        const updated = await transaction.patientEmergencyContact.update({ where: { id: contact.id }, data: { isActive: false, isPrimary: false }, select: { id: true, isActive: true, isPrimary: true } });
        entityType = "PatientEmergencyContact"; entityId = updated.id;
        await recordAudit(transaction, actorEmployeeId, entityType, entityId, input.action);
        return { kind: "EMERGENCY_CONTACT" as const, record: updated };
      }
    }
  }, { isolationLevel: "Serializable" });
}
