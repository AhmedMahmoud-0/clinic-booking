import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "../../../generated/prisma/client";
import { toClinicLocalDateTime } from "../../lib/clinic-time";
import { getPatientPhoneMatchKey } from "../patient-management/validation";
import { getPrismaClient } from "../db/client";
import { isAppointmentSlotSelected, isPatientBookingAuthorized } from "./appointment-booking-policy";
import { AppointmentBookingError } from "./appointment-booking-errors";
import { getPublicAppointmentAvailability } from "./appointment-availability";
import type { CreatePatientAppointmentInput } from "./appointment-booking-validation";
import type { CreateGuestAppointmentInput } from "./guest-appointment-booking-validation";
import type { CreateReceptionAppointmentInput } from "./reception-appointment-booking-validation";
import type { PatientAppointmentOverlapReasonCode } from "./patient-overlap-exception-validation";
import { isPatientAppointmentOverlapExceptionActor } from "./patient-overlap-exception-policy";
import { isReceptionAppointmentActor } from "./reception-appointment-booking-policy";
import { AppointmentAvailabilityError } from "./availability-errors";
import {
  verifyPatientIdentityMatch,
  type PatientIdentityVerificationInput,
  type PatientIdentityVerificationRecord,
} from "../patient-management/identity-verification-validation";
import { isGuestAppointmentPendingResolution } from "./guest-appointment-resolution-policy";

type Transaction = Prisma.TransactionClient;

const BLOCKING_APPOINTMENT_STATUSES = [
  "CONFIRMED",
  "CHECKED_IN",
  "WAITING",
  "IN_CONSULTATION",
] as const;

interface BookingSelectionInput {
  doctorId: string;
  serviceId: string;
  startsAt: string;
}

interface PatientAppointmentOverlapConflict {
  id: string;
  startsAt: Date;
  endsAt: Date;
}

interface BookingContext {
  now: Date;
  startsAt: Date;
  endsAt: Date;
  doctorService: {
    id: string;
    durationMinutes: number;
    price: Prisma.Decimal;
    currencyCode: string;
  };
  consultationRoomId: string | null;
  patientOverlapConflicts: PatientAppointmentOverlapConflict[];
}

function createBookingReference(): string {
  return randomBytes(12).toString("hex").toUpperCase();
}

function createGuestManagementToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashGuestManagementToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function isDatabaseAppointmentConflict(error: unknown): boolean {
  if (isPrismaCode(error, "P2034")) return true;

  const metadata =
    typeof error === "object" && error !== null && "meta" in error &&
    typeof error.meta === "object" && error.meta !== null
      ? error.meta as Record<string, unknown>
      : null;
  const databaseMessage = metadata
    ? [metadata.database_error, metadata.constraint, metadata.code].filter(Boolean).join(" ")
    : "";
  const message = `${error instanceof Error ? error.message : ""} ${databaseMessage}`;

  return /exclusion constraint|Appointment_(doctor|patient|room)_no_overlap|23P01/i.test(message);
}

async function assertPatientBookingAuthority(
  transaction: Transaction,
  actorPatientId: string,
  subjectPatientId: string,
  now: Date,
): Promise<void> {
  const [actor, subject] = await Promise.all([
    transaction.patient.findUnique({
      where: { id: actorPatientId },
      select: { id: true, isActive: true },
    }),
    transaction.patient.findUnique({
      where: { id: subjectPatientId },
      select: { id: true, isActive: true, dateOfBirth: true },
    }),
  ]);

  if (!actor || !subject) {
    throw new AppointmentBookingError(
      "BOOKING_AUTHORITY_REQUIRED",
      "You are not authorized to book an appointment for this patient.",
      403,
    );
  }

  let grant: Parameters<typeof isPatientBookingAuthorized>[0]["grant"] = null;

  if (actorPatientId !== subjectPatientId) {
    const record = await transaction.patientAccessGrant.findUnique({
      where: {
        subjectPatientId_granteePatientId: {
          subjectPatientId,
          granteePatientId: actorPatientId,
        },
      },
      select: {
        status: true,
        verifiedAt: true,
        verifiedByEmployeeId: true,
        expiresAt: true,
        revokedAt: true,
        approvedByPatientId: true,
        approvedAt: true,
        relationship: {
          select: {
            isActive: true,
            isLegalGuardian: true,
            guardianVerifiedAt: true,
            guardianVerifiedByEmployeeId: true,
          },
        },
        permissions: { select: { scope: true } },
      },
    });

    if (record) {
      grant = {
        status: record.status,
        verifiedAt: record.verifiedAt,
        verifiedByEmployeeId: record.verifiedByEmployeeId,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
        approvedByPatientId: record.approvedByPatientId,
        approvedAt: record.approvedAt,
        scopes: record.permissions.map((permission) => permission.scope),
        relationshipIsActive: record.relationship.isActive,
        relationshipIsLegalGuardian: record.relationship.isLegalGuardian,
        relationshipGuardianVerifiedAt: record.relationship.guardianVerifiedAt,
        relationshipGuardianVerifiedByEmployeeId: record.relationship.guardianVerifiedByEmployeeId,
      };
    }
  }

  const authorized = isPatientBookingAuthorized({
    actorPatientId,
    subjectPatientId,
    actorIsActive: actor.isActive,
    subjectIsActive: subject.isActive,
    subjectDateOfBirth: subject.dateOfBirth,
    grant,
    now,
  });

  if (!authorized) {
    throw new AppointmentBookingError(
      "BOOKING_AUTHORITY_REQUIRED",
      "You are not authorized to book an appointment for this patient.",
      403,
    );
  }
}

/**
 * Acquire a per-patient write lock before reading that patient's overlapping
 * appointments. The database trigger repeats the version bump on appointment
 * writes, so direct SQL and future routes also participate in the same mutex.
 */
async function lockPatientAppointmentSchedule(
  transaction: Transaction,
  patientId: string,
): Promise<void> {
  const updated = await transaction.$executeRaw`
    UPDATE "Patient"
      SET "appointmentScheduleVersion" = "appointmentScheduleVersion" + 1
      WHERE "id" = ${patientId} AND "isActive" = TRUE
  `;

  if (updated !== 1) {
    throw new AppointmentBookingError(
      "ACTIVE_PATIENT_REQUIRED",
      "Select an existing active patient record before booking.",
      404,
    );
  }
}

async function prepareBookingContext(
  transaction: Transaction,
  input: BookingSelectionInput,
  patientId: string | null,
  options: { allowPatientOverlap?: boolean } = {},
): Promise<BookingContext> {
  const now = new Date();
  const requestedStartsAt = new Date(input.startsAt);
  const localDate = toClinicLocalDateTime(requestedStartsAt).localDate;

  let availability: Awaited<ReturnType<typeof getPublicAppointmentAvailability>>;
  try {
    availability = await getPublicAppointmentAvailability(
      { doctorId: input.doctorId, serviceId: input.serviceId, date: localDate },
      transaction,
    );
  } catch (error) {
    if (error instanceof AppointmentAvailabilityError) {
      throw new AppointmentBookingError(
        "APPOINTMENT_SLOT_UNAVAILABLE",
        "The selected appointment time is no longer available. Refresh the available times and choose another slot.",
        409,
      );
    }
    throw error;
  }

  const selectedSlot = isAppointmentSlotSelected(availability.slots, requestedStartsAt);
  if (!selectedSlot) {
    throw new AppointmentBookingError(
      "APPOINTMENT_SLOT_UNAVAILABLE",
      "The selected appointment time is no longer available. Refresh the available times and choose another slot.",
      409,
    );
  }

  const doctorService = await transaction.doctorService.findFirst({
    where: {
      doctorId: input.doctorId,
      serviceId: input.serviceId,
      isActive: true,
      service: {
        is: {
          isActive: true,
          type: { in: ["CONSULTATION", "FOLLOW_UP"] },
        },
      },
    },
    select: {
      id: true,
      durationMinutes: true,
      price: true,
      currencyCode: true,
    },
  });

  if (!doctorService ||
      selectedSlot.endsAt.getTime() - selectedSlot.startsAt.getTime() !== doctorService.durationMinutes * 60_000) {
    throw new AppointmentBookingError(
      "APPOINTMENT_SELECTION_CHANGED",
      "The selected service details changed. Refresh the available times and try again.",
      409,
    );
  }

  // A verified patient booking is checked against that Patient's current active
  // appointments. A guest has no verified Patient identity yet, so it must not
  // be attached to or matched to a Patient using phone number alone.
  let patientOverlapConflicts: PatientAppointmentOverlapConflict[] = [];
  if (patientId !== null) {
    await lockPatientAppointmentSchedule(transaction, patientId);
    patientOverlapConflicts = await transaction.appointment.findMany({
      where: {
        patientId,
        status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
        startsAt: { lt: selectedSlot.endsAt },
        endsAt: { gt: selectedSlot.startsAt },
      },
      orderBy: { id: "asc" },
      select: { id: true, startsAt: true, endsAt: true },
    });

    if (patientOverlapConflicts.length > 0 && !options.allowPatientOverlap) {
      throw new AppointmentBookingError(
        "PATIENT_APPOINTMENT_OVERLAP",
        "This patient already has an overlapping appointment. Choose another time or use the separately authorized Reception exception workflow.",
        409,
      );
    }
  }

  // The availability service confirms at least one configured room is free.
  // Select that room in this transaction; PostgreSQL remains the final guard.
  const activeRooms = await transaction.consultationRoom.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: { id: true },
  });

  let consultationRoomId: string | null = null;
  for (const room of activeRooms) {
    const roomConflict = await transaction.appointment.findFirst({
      where: {
        consultationRoomId: room.id,
        status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
        startsAt: { lt: selectedSlot.endsAt },
        endsAt: { gt: selectedSlot.startsAt },
      },
      select: { id: true },
    });

    if (!roomConflict) {
      consultationRoomId = room.id;
      break;
    }
  }

  if (activeRooms.length > 0 && consultationRoomId === null) {
    throw new AppointmentBookingError(
      "CONSULTATION_ROOM_UNAVAILABLE",
      "No consultation room is available for the selected time. Choose another slot.",
      409,
    );
  }

  return {
    now,
    startsAt: selectedSlot.startsAt,
    endsAt: selectedSlot.endsAt,
    doctorService,
    consultationRoomId,
    patientOverlapConflicts,
  };
}

async function createAppointmentRecord(
  transaction: Transaction,
  input: BookingSelectionInput,
  context: BookingContext,
  identity: {
    patientId: string | null;
    source: "PATIENT_PORTAL" | "PUBLIC_WEBSITE" | "RECEPTION";
    actorPatientId?: string;
    actorEmployeeId?: string;
    guestContact?: {
      fullName: string;
      phone: string;
      normalizedPhone: string;
      email: string | null;
      manageTokenHash: string;
      manageTokenIssuedAt: Date;
    };
  },
) {
  return transaction.appointment.create({
    data: {
      bookingReference: createBookingReference(),
      patientId: identity.patientId,
      doctorId: input.doctorId,
      doctorServiceId: context.doctorService.id,
      consultationRoomId: context.consultationRoomId,
      createdByEmployeeId: identity.actorEmployeeId ?? null,
      source: identity.source,
      status: "CONFIRMED",
      startsAt: context.startsAt,
      endsAt: context.endsAt,
      durationMinutes: context.doctorService.durationMinutes,
      bookedPrice: context.doctorService.price,
      currencyCode: context.doctorService.currencyCode,
      confirmedAt: context.now,
      ...(identity.guestContact ? { guestContact: { create: identity.guestContact } } : {}),
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: "CONFIRMED",
          changeSource: identity.actorPatientId ? "PATIENT" : identity.actorEmployeeId ? "STAFF" : "SYSTEM",
          changedByPatientId: identity.actorPatientId ?? null,
          changedByEmployeeId: identity.actorEmployeeId ?? null,
        },
      },
    },
    select: {
      id: true,
      bookingReference: true,
      status: true,
      startsAt: true,
      endsAt: true,
      durationMinutes: true,
      bookedPrice: true,
      currencyCode: true,
      confirmedAt: true,
      doctorService: {
        select: {
          service: { select: { name: true } },
          doctor: { select: { publicDisplayName: true, professionalTitle: true } },
        },
      },
    },
  });
}

function confirmationFields(appointment: Awaited<ReturnType<typeof createAppointmentRecord>>) {
  const localStart = toClinicLocalDateTime(appointment.startsAt);
  const localEnd = toClinicLocalDateTime(appointment.endsAt);
  return {
    bookingReference: appointment.bookingReference,
    status: appointment.status,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    localDate: localStart.localDate,
    startTime: localStart.localTime,
    endTime: localEnd.localTime,
    durationMinutes: appointment.durationMinutes,
    bookedPrice: appointment.bookedPrice.toFixed(2),
    currencyCode: appointment.currencyCode,
    confirmedAt: appointment.confirmedAt.toISOString(),
    doctor: {
      displayName: appointment.doctorService.doctor.publicDisplayName ?? "Doctor",
      professionalTitle: appointment.doctorService.doctor.professionalTitle,
    },
    service: { name: appointment.doctorService.service.name },
  };
}

async function createPatientAppointmentInTransaction(
  transaction: Transaction,
  input: CreatePatientAppointmentInput,
  actorPatientId: string,
) {
  const now = new Date();
  await assertPatientBookingAuthority(transaction, actorPatientId, input.patientId, now);
  const context = await prepareBookingContext(transaction, input, input.patientId);
  const appointment = await createAppointmentRecord(transaction, input, context, {
    patientId: input.patientId,
    source: "PATIENT_PORTAL",
    actorPatientId,
  });

  return {
    appointmentId: appointment.id,
    ...confirmationFields(appointment),
  };
}

async function createGuestAppointmentInTransaction(
  transaction: Transaction,
  input: CreateGuestAppointmentInput,
) {
  const context = await prepareBookingContext(transaction, input, null);
  const managementToken = createGuestManagementToken();
  const appointment = await createAppointmentRecord(transaction, input, context, {
    patientId: null,
    source: "PUBLIC_WEBSITE",
    guestContact: {
      fullName: input.fullName,
      phone: input.phone,
      normalizedPhone: getPatientPhoneMatchKey(input.phone),
      email: input.email ?? null,
      manageTokenHash: hashGuestManagementToken(managementToken),
      manageTokenIssuedAt: context.now,
    },
  });

  // Audit metadata records the external booking event without storing the
  // submitted name, phone, email, management token, or any medical information.
  await transaction.auditLog.create({
    data: {
      actorType: "EXTERNAL",
      action: "GUEST_APPOINTMENT_BOOKED",
      entityType: "Appointment",
      entityId: appointment.id,
      reason: "A public guest appointment was confirmed without creating or linking a Patient record.",
    },
  });

  return {
    ...confirmationFields(appointment),
    guestManagementToken: managementToken,
  };
}


async function createReceptionAppointmentInTransaction(
  transaction: Transaction,
  input: CreateReceptionAppointmentInput,
  actorEmployeeId: string,
) {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: {
      status: true,
      roleAssignments: {
        where: { status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  if (!employee || !isReceptionAppointmentActor({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
  })) {
    throw new AppointmentBookingError(
      "RECEPTION_PERMISSION_REQUIRED",
      "An active Reception employee is required to create this appointment.",
      403,
    );
  }

  const patient = await transaction.patient.findUnique({
    where: { id: input.patientId },
    select: { id: true, isActive: true },
  });
  if (!patient || !patient.isActive) {
    throw new AppointmentBookingError(
      "PATIENT_NOT_BOOKABLE",
      "Select an existing active patient record before booking.",
      404,
    );
  }

  const requestedOverlapException = input.patientOverlapReasonCode !== undefined;
  const context = await prepareBookingContext(
    transaction,
    input,
    input.patientId,
    { allowPatientOverlap: requestedOverlapException },
  );

  if (requestedOverlapException && context.patientOverlapConflicts.length === 0) {
    throw new AppointmentBookingError(
      "PATIENT_OVERLAP_EXCEPTION_NOT_REQUIRED",
      "An overlap exception reason is accepted only when an actual same-patient appointment conflict exists.",
      400,
    );
  }

  if (context.patientOverlapConflicts.length > 0 &&
      !isPatientAppointmentOverlapExceptionActor({
        employeeStatus: employee.status,
        activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
      })) {
    throw new AppointmentBookingError(
      "PATIENT_OVERLAP_OVERRIDE_PERMISSION_REQUIRED",
      "Your active role does not have permission to authorize a patient appointment overlap.",
      403,
    );
  }

  const appointment = await createAppointmentRecord(transaction, input, context, {
    patientId: input.patientId,
    source: "RECEPTION",
    actorEmployeeId,
  });

  if (context.patientOverlapConflicts.length > 0) {
    await transaction.appointmentPatientOverlapException.createMany({
      data: context.patientOverlapConflicts.map((conflict) => ({
        appointmentId: appointment.id,
        conflictingAppointmentId: conflict.id,
        patientId: input.patientId,
        authorizedByEmployeeId: actorEmployeeId,
        reasonCode: input.patientOverlapReasonCode!,
        appointmentStartsAt: context.startsAt,
        appointmentEndsAt: context.endsAt,
        conflictingStartsAt: conflict.startsAt,
        conflictingEndsAt: conflict.endsAt,
      })),
    });
  }

  await transaction.auditLog.create({
    data: {
      actorType: "EMPLOYEE",
      actorEmployeeId,
      action: "RECEPTION_APPOINTMENT_BOOKED",
      entityType: "Appointment",
      entityId: appointment.id,
      reason: "An active Reception employee booked an appointment for an existing patient record.",
    },
  });

  if (context.patientOverlapConflicts.length > 0) {
    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "PATIENT_APPOINTMENT_OVERLAP_EXCEPTION_GRANTED",
        entityType: "Appointment",
        entityId: appointment.id,
        reason: `Reception authorized ${context.patientOverlapConflicts.length} exact patient appointment overlap(s); reason code: ${input.patientOverlapReasonCode}.`,
        occurredAt: context.now,
      },
    });
  }

  return {
    appointmentId: appointment.id,
    ...confirmationFields(appointment),
    patientOverlapException: context.patientOverlapConflicts.length > 0
      ? { conflictCount: context.patientOverlapConflicts.length, reasonCode: input.patientOverlapReasonCode! }
      : null,
  };
}

/**
 * Creates a confirmed appointment for a verified portal patient or an exact
 * BOOK_APPOINTMENTS delegate. Booking authority never grants medical access.
 */
export async function createPatientAppointment(
  input: CreatePatientAppointmentInput,
  actorPatientId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) =>
        createPatientAppointmentInTransaction(transaction, input, actorPatientId),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPatientOverlapDatabaseConflict(error)) {
      throw new AppointmentBookingError(
        "PATIENT_APPOINTMENT_OVERLAP",
        "This patient already has an overlapping appointment. Refresh the appointment list and try again.",
        409,
      );
    }
    if (isDatabaseAppointmentConflict(error)) {
      throw new AppointmentBookingError(
        "APPOINTMENT_CONFLICT",
        "The appointment could not be confirmed because the time or room was booked at the same time. Refresh availability and try again.",
        409,
      );
    }
    throw error;
  }
}

/**
 * Creates a public guest appointment without creating a Patient, PatientContact,
 * MRN, PatientAccount, identity verification, or delegation grant. The one-time
 * management token is returned only in the immediate no-store confirmation;
 * only its SHA-256 hash is persisted for a future guest self-service route.
 */
export async function createGuestAppointment(input: CreateGuestAppointmentInput) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) => createGuestAppointmentInTransaction(transaction, input),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isDatabaseAppointmentConflict(error)) {
      throw new AppointmentBookingError(
        "APPOINTMENT_CONFLICT",
        "The appointment could not be confirmed because the time or room was booked at the same time. Refresh availability and try again.",
        409,
      );
    }
    throw error;
  }
}

/**
 * Creates a confirmed appointment for an existing patient through Reception.
 * A same-patient overlap requires the dedicated Reception permission, a bounded
 * reason code, and one immutable audit row for every exact conflicting pair.
 */
export async function createReceptionAppointment(
  input: CreateReceptionAppointmentInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) =>
        createReceptionAppointmentInTransaction(transaction, input, actorEmployeeId),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPatientOverlapDatabaseConflict(error)) {
      throw new AppointmentBookingError(
        "PATIENT_APPOINTMENT_OVERLAP",
        "This patient already has an overlapping appointment. The exception could not be verified; refresh and try again.",
        409,
      );
    }
    if (isDatabaseAppointmentConflict(error)) {
      throw new AppointmentBookingError(
        "APPOINTMENT_CONFLICT",
        "The appointment could not be confirmed because the time or room was booked at the same time. Refresh availability and try again.",
        409,
      );
    }
    throw error;
  }
}



interface ResolveGuestAppointmentInput {
  patientId: string;
  identity: PatientIdentityVerificationInput;
  patientOverlapReasonCode?: PatientAppointmentOverlapReasonCode;
}

function isPatientOverlapDatabaseConflict(error: unknown): boolean {
  const metadata =
    typeof error === "object" && error !== null && "meta" in error &&
    typeof error.meta === "object" && error.meta !== null
      ? error.meta as Record<string, unknown>
      : null;
  const databaseMessage = metadata
    ? [metadata.database_error, metadata.constraint, metadata.code].filter(Boolean).join(" ")
    : "";
  const message = `${error instanceof Error ? error.message : ""} ${databaseMessage}`;
  return /Appointment_patient_no_overlap/i.test(message);
}

function revokeGuestManagementTokenHash(): string {
  // The old bearer token is invalidated after Reception establishes a verified
  // Patient link. A replacement random hash is never returned to any caller.
  const unreachableToken = randomBytes(32).toString("base64url");
  return hashGuestManagementToken(unreachableToken);
}

async function resolveGuestAppointmentInTransaction(
  transaction: Transaction,
  appointmentId: string,
  input: ResolveGuestAppointmentInput,
  actorEmployeeId: string,
) {
  const employee = await transaction.employee.findUnique({
    where: { id: actorEmployeeId },
    select: {
      status: true,
      roleAssignments: {
        where: { status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  if (!employee || !isReceptionAppointmentActor({
    employeeStatus: employee.status,
    activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
  })) {
    throw new AppointmentBookingError(
      "RECEPTION_PERMISSION_REQUIRED",
      "An active Reception employee is required to resolve a guest appointment.",
      403,
    );
  }

  const appointment = await transaction.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      source: true,
      status: true,
      startsAt: true,
      endsAt: true,
      guestContact: {
        select: {
          id: true,
          resolutionStatus: true,
          resolvedPatientId: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppointmentBookingError(
      "GUEST_APPOINTMENT_NOT_FOUND",
      "The guest appointment could not be found.",
      404,
    );
  }

  if (!isGuestAppointmentPendingResolution({
    source: appointment.source,
    status: appointment.status,
    patientId: appointment.patientId,
    guestContact: appointment.guestContact,
  })) {
    throw new AppointmentBookingError(
      "GUEST_APPOINTMENT_NOT_RESOLVABLE",
      "Only an unresolved, confirmed public guest appointment can be linked to a Patient record.",
      409,
    );
  }

  const patient = await transaction.patient.findFirst({
    where: { id: input.patientId, isActive: true },
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
    throw new AppointmentBookingError(
      "ACTIVE_PATIENT_REQUIRED",
      "Select an existing active Patient record before resolving this guest appointment.",
      404,
    );
  }

  const now = new Date();
  const identityMatches = verifyPatientIdentityMatch(
    patient as PatientIdentityVerificationRecord,
    input.identity,
  );

  if (!identityMatches) {
    const verification = await transaction.identityVerification.create({
      data: {
        patientId: patient.id,
        appointmentId: appointment.id,
        firstElement: input.identity.firstIdentifier.type,
        secondElement: input.identity.secondIdentifier.type,
        result: "FAILED",
        performedByEmployeeId: actorEmployeeId,
        verifiedAt: now,
        notes: "Two distinct identity elements were compared with the selected Patient record and did not both match. Submitted values were not retained.",
      },
      select: { id: true },
    });

    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "GUEST_APPOINTMENT_IDENTITY_VERIFICATION_FAILED",
        entityType: "IdentityVerification",
        entityId: verification.id,
        reason: "Two distinct identity elements did not both match the selected Patient record. Submitted values were not retained.",
        occurredAt: now,
      },
    });

    return {
      outcome: "IDENTITY_MISMATCH" as const,
      appointmentId: appointment.id,
      verificationId: verification.id,
    };
  }

  await lockPatientAppointmentSchedule(transaction, patient.id);
  const patientOverlapConflicts = await transaction.appointment.findMany({
    where: {
      id: { not: appointment.id },
      patientId: patient.id,
      status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
      startsAt: { lt: appointment.endsAt },
      endsAt: { gt: appointment.startsAt },
    },
    orderBy: { id: "asc" },
    select: { id: true, startsAt: true, endsAt: true },
  });

  if (patientOverlapConflicts.length > 0 && !input.patientOverlapReasonCode) {
    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "GUEST_APPOINTMENT_LINK_BLOCKED_PATIENT_OVERLAP",
        entityType: "Appointment",
        entityId: appointment.id,
        reason: "Guest-to-Patient linking was blocked by an existing overlapping appointment. The guest booking remains unresolved; no overlap exception was applied.",
        occurredAt: now,
      },
    });

    return {
      outcome: "PATIENT_OVERLAP" as const,
      appointmentId: appointment.id,
    };
  }

  if (patientOverlapConflicts.length === 0 && input.patientOverlapReasonCode) {
    throw new AppointmentBookingError(
      "PATIENT_OVERLAP_EXCEPTION_NOT_REQUIRED",
      "An overlap exception reason is accepted only when an actual same-patient appointment conflict exists.",
      400,
    );
  }

  if (patientOverlapConflicts.length > 0 &&
      !isPatientAppointmentOverlapExceptionActor({
        employeeStatus: employee.status,
        activeRoles: employee.roleAssignments.map((assignment) => assignment.role),
      })) {
    throw new AppointmentBookingError(
      "PATIENT_OVERLAP_OVERRIDE_PERMISSION_REQUIRED",
      "Your active role does not have permission to authorize a patient appointment overlap.",
      403,
    );
  }

  // The verification record, Patient link, guest-resolution state, and audits
  // are committed together. Migration 9's deferred trigger verifies that all
  // three identity records agree at transaction commit.
  const verification = await transaction.identityVerification.create({
    data: {
      patientId: patient.id,
      appointmentId: appointment.id,
      firstElement: input.identity.firstIdentifier.type,
      secondElement: input.identity.secondIdentifier.type,
      result: "VERIFIED",
      performedByEmployeeId: actorEmployeeId,
      verifiedAt: now,
      notes: "Two distinct identity elements matched the selected Patient record during guest appointment resolution. Submitted values were not retained.",
    },
    select: { id: true },
  });

  const appointmentUpdate = await transaction.appointment.updateMany({
    where: { id: appointment.id, patientId: null, status: "CONFIRMED" },
    data: { patientId: patient.id },
  });
  if (appointmentUpdate.count !== 1) {
    throw new AppointmentBookingError(
      "GUEST_APPOINTMENT_STATE_CHANGED",
      "The guest appointment changed while it was being resolved. Refresh the appointment and try again.",
      409,
    );
  }

  if (patientOverlapConflicts.length > 0) {
    await transaction.appointmentPatientOverlapException.createMany({
      data: patientOverlapConflicts.map((conflict) => ({
        appointmentId: appointment.id,
        conflictingAppointmentId: conflict.id,
        patientId: patient.id,
        authorizedByEmployeeId: actorEmployeeId,
        reasonCode: input.patientOverlapReasonCode!,
        appointmentStartsAt: appointment.startsAt,
        appointmentEndsAt: appointment.endsAt,
        conflictingStartsAt: conflict.startsAt,
        conflictingEndsAt: conflict.endsAt,
      })),
    });
  }

  const guestUpdate = await transaction.guestAppointmentContact.updateMany({
    where: {
      id: appointment.guestContact!.id,
      resolutionStatus: "PENDING_VERIFICATION",
      resolvedPatientId: null,
    },
    data: {
      resolutionStatus: "LINKED",
      resolvedPatientId: patient.id,
      resolvedByEmployeeId: actorEmployeeId,
      resolvedAt: now,
      manageTokenHash: revokeGuestManagementTokenHash(),
    },
  });
  if (guestUpdate.count !== 1) {
    throw new AppointmentBookingError(
      "GUEST_APPOINTMENT_STATE_CHANGED",
      "The guest appointment changed while it was being resolved. Refresh the appointment and try again.",
      409,
    );
  }

  await transaction.auditLog.createMany({
    data: [
      {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "PATIENT_IDENTITY_VERIFIED",
        entityType: "IdentityVerification",
        entityId: verification.id,
        reason: "Two distinct stored Patient identity elements matched during Reception guest-appointment resolution. Submitted values were not retained.",
        occurredAt: now,
      },
      {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "GUEST_APPOINTMENT_LINKED",
        entityType: "Appointment",
        entityId: appointment.id,
        reason: "Reception linked a confirmed public guest appointment to the exact existing Patient after two-element identity verification. The guest management token was revoked.",
        occurredAt: now,
      },
    ],
  });

  if (patientOverlapConflicts.length > 0) {
    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "PATIENT_APPOINTMENT_OVERLAP_EXCEPTION_GRANTED",
        entityType: "Appointment",
        entityId: appointment.id,
        reason: `Reception authorized ${patientOverlapConflicts.length} exact patient appointment overlap(s) while resolving the guest booking; reason code: ${input.patientOverlapReasonCode}.`,
        occurredAt: now,
      },
    });
  }

  return {
    outcome: "LINKED" as const,
    appointmentId: appointment.id,
    patientId: patient.id,
    verificationId: verification.id,
    linkedAt: now.toISOString(),
    patientOverlapException: patientOverlapConflicts.length > 0
      ? { conflictCount: patientOverlapConflicts.length, reasonCode: input.patientOverlapReasonCode! }
      : null,
  };
}

/**
 * Resolve a confirmed public guest appointment to one existing active Patient.
 * The guest contact is never used as identity evidence: Reception must submit
 * two distinct identifiers that both match the selected Patient record.
 */
export async function resolveGuestAppointmentToPatient(
  appointmentId: string,
  input: ResolveGuestAppointmentInput,
  actorEmployeeId: string,
) {
  const prisma = getPrismaClient();

  try {
    return await prisma.$transaction(
      (transaction: Transaction) =>
        resolveGuestAppointmentInTransaction(transaction, appointmentId, input, actorEmployeeId),
      { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 },
    );
  } catch (error) {
    if (error instanceof AppointmentBookingError) throw error;
    if (isPatientOverlapDatabaseConflict(error)) {
      throw new AppointmentBookingError(
        "PATIENT_APPOINTMENT_OVERLAP",
        "This Patient has another overlapping appointment. Resolve the conflict before linking the guest appointment.",
        409,
      );
    }
    if (isDatabaseAppointmentConflict(error)) {
      throw new AppointmentBookingError(
        "APPOINTMENT_CONFLICT",
        "The guest appointment could not be linked because a concurrent scheduling change occurred. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}
