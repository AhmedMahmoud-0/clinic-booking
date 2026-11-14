import "server-only";

import { getPrismaClient } from "../db/client";
import { isPatientSelfCancellationAllowed } from "../appointments/patient-appointment-cancellation-policy";
import { isPatientSelfReschedulingAllowed } from "../appointments/patient-appointment-rescheduling-policy";

const appointmentSelect = {
  id: true,
  bookingReference: true,
  patientId: true,
  status: true,
  startsAt: true,
  endsAt: true,
  durationMinutes: true,
  confirmedAt: true,
  cancelledAt: true,
  completedAt: true,
  doctorId: true,
  doctorService: {
    select: {
      serviceId: true,
      service: { select: { name: true } },
      doctor: {
        select: {
          publicDisplayName: true,
          professionalTitle: true,
          employee: { select: { firstName: true, lastName: true } },
          specialties: {
            orderBy: { isPrimary: "desc" as const },
            take: 1,
            select: { specialty: { select: { name: true } } },
          },
        },
      },
    },
  },
} as const;

function toAppointmentDto(record: {
  id: string;
  bookingReference: string;
  patientId: string | null;
  status: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  confirmedAt: Date;
  cancelledAt: Date | null;
  completedAt: Date | null;
  doctorId: string;
  doctorService: {
    serviceId: string;
    service: { name: string };
    doctor: {
      publicDisplayName: string | null;
      professionalTitle: string | null;
      employee: { firstName: string; lastName: string };
      specialties: Array<{ specialty: { name: string } }>;
    };
  };
}, now: Date) {
  const doctor = record.doctorService.doctor;
  const doctorName = doctor.publicDisplayName?.trim() ||
    [doctor.employee.firstName, doctor.employee.lastName].filter(Boolean).join(" ") ||
    "Medical doctor";
  const canCancel = isPatientSelfCancellationAllowed({
    patientId: record.patientId,
    status: record.status,
    startsAt: record.startsAt,
    now,
  });
  const canReschedule = isPatientSelfReschedulingAllowed({
    patientId: record.patientId,
    status: record.status,
    currentStartsAt: record.startsAt,
    requestedStartsAt: new Date(now.getTime() + 60_000),
    now,
  });

  return {
    id: record.id,
    bookingReference: record.bookingReference,
    status: record.status,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
    durationMinutes: record.durationMinutes,
    confirmedAt: record.confirmedAt.toISOString(),
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    doctorId: record.doctorId,
    serviceId: record.doctorService.serviceId,
    doctor: {
      name: doctorName,
      professionalTitle: doctor.professionalTitle,
      specialty: doctor.specialties[0]?.specialty.name ?? null,
    },
    service: { name: record.doctorService.service.name },
    canCancel,
    canReschedule,
  };
}

export type PatientAppointmentView = "UPCOMING" | "PAST" | "CANCELLED";

export async function getPatientAppointments(
  patientId: string,
  view: PatientAppointmentView | null = null,
) {
  const prisma = getPrismaClient();
  const now = new Date();
  const where = {
    patientId,
    ...(view === "UPCOMING"
      ? { status: "CONFIRMED" as const, startsAt: { gte: now } }
      : view === "PAST"
        ? { startsAt: { lt: now }, status: { not: "CANCELLED" as const } }
        : view === "CANCELLED"
          ? { status: "CANCELLED" as const }
          : {}),
  };
  const records = await prisma.appointment.findMany({
    where,
    orderBy: { startsAt: view === "UPCOMING" ? "asc" : "desc" },
    take: 100,
    select: appointmentSelect,
  });

  return records.map((record) => toAppointmentDto(record, now));
}

export async function getPatientAppointment(patientId: string, appointmentId: string) {
  const prisma = getPrismaClient();
  const now = new Date();
  const record = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId },
    select: appointmentSelect,
  });
  return record ? toAppointmentDto(record, now) : null;
}

export async function getPatientDashboard(patientId: string) {
  const prisma = getPrismaClient();
  const now = new Date();
  const [
    patient,
    upcomingCount,
    completedVisitCount,
    cancelledCount,
    prescriptionCount,
    releasedLabResultCount,
    releasedRadiologyReportCount,
    nextAppointments,
    recentVisits,
  ] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: patientId, isActive: true },
      select: { firstName: true, preferredName: true, lastName: true },
    }),
    prisma.appointment.count({ where: { patientId, status: "CONFIRMED", startsAt: { gte: now } } }),
    prisma.encounter.count({ where: { patientId, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { patientId, status: "CANCELLED" } }),
    prisma.prescription.count({
      where: { status: "ISSUED", issuedAt: { not: null }, encounter: { patientId, status: "COMPLETED" } },
    }),
    prisma.labResult.count({
      where: {
        status: "RELEASED",
        releasedAt: { not: null },
        orderItem: {
          labOrder: {
            OR: [
              { encounter: { patientId, status: "COMPLETED" } },
              { externalIntake: { patientId } },
            ],
          },
        },
      },
    }),
    prisma.radiologyReport.count({
      where: {
        status: "RELEASED",
        releasedAt: { not: null },
        exam: { orderItem: { radiologyOrder: { encounter: { patientId, status: "COMPLETED" } } } },
      },
    }),
    prisma.appointment.findMany({
      where: { patientId, status: "CONFIRMED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 3,
      select: appointmentSelect,
    }),
    prisma.encounter.findMany({
      where: { patientId, status: "COMPLETED" },
      orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
      take: 3,
      select: {
        id: true,
        startedAt: true,
        completedAt: true,
        doctor: {
          select: {
            publicDisplayName: true,
            professionalTitle: true,
            employee: { select: { firstName: true, lastName: true } },
            specialties: {
              orderBy: { isPrimary: "desc" },
              take: 1,
              select: { specialty: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  if (!patient) return null;
  const nextAppointmentsDto = nextAppointments.map((record) => toAppointmentDto(record, now));
  return {
    patientName: patient.preferredName?.trim() || [patient.firstName, patient.lastName].filter(Boolean).join(" "),
    counts: {
      upcomingAppointments: upcomingCount,
      completedVisits: completedVisitCount,
      cancelledAppointments: cancelledCount,
      issuedPrescriptions: prescriptionCount,
      releasedLabResults: releasedLabResultCount,
      releasedRadiologyReports: releasedRadiologyReportCount,
    },
    nextAppointments: nextAppointmentsDto,
    recentVisits: recentVisits.map((record) => {
      const doctor = record.doctor;
      const name = doctor.publicDisplayName?.trim() ||
        [doctor.employee.firstName, doctor.employee.lastName].filter(Boolean).join(" ") ||
        "Medical doctor";
      return {
        id: record.id,
        startedAt: record.startedAt.toISOString(),
        completedAt: record.completedAt?.toISOString() ?? null,
        doctor: {
          name,
          specialty: doctor.specialties[0]?.specialty.name ?? null,
        },
      };
    }),
  };
}

export async function getPatientProfile(patientId: string) {
  const prisma = getPrismaClient();
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, isActive: true },
    select: {
      mrn: true,
      firstName: true,
      middleName: true,
      lastName: true,
      preferredName: true,
      dateOfBirth: true,
      gender: true,
      contacts: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: { type: true, value: true, isPrimary: true, verifiedAt: true },
      },
      addresses: {
        where: { isActive: true, isPrimary: true },
        take: 1,
        select: {
          addressLine1: true,
          addressLine2: true,
          district: true,
          city: true,
          governorate: true,
          countryCode: true,
        },
      },
      authAccount: { select: { user: { select: { email: true, emailVerified: true } } } },
    },
  });

  if (!patient) return null;
  const address = patient.addresses[0] ?? null;
  return {
    medicalRecordNumber: patient.mrn,
    fullName: [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(" "),
    preferredName: patient.preferredName,
    dateOfBirth: patient.dateOfBirth?.toISOString() ?? null,
    gender: patient.gender,
    contacts: patient.contacts.map((contact) => ({
      type: contact.type,
      value: contact.value,
      isPrimary: contact.isPrimary,
      isVerified: contact.verifiedAt !== null,
    })),
    address: address
      ? [address.addressLine1, address.addressLine2, address.district, address.city, address.governorate, address.countryCode]
          .filter(Boolean)
          .join(", ")
      : null,
    account: patient.authAccount
      ? { email: patient.authAccount.user.email, emailVerified: patient.authAccount.user.emailVerified }
      : null,
  };
}

export async function getPatientVisitHistory(patientId: string) {
  const prisma = getPrismaClient();
  const records = await prisma.encounter.findMany({
    where: { patientId, status: "COMPLETED" },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      doctor: {
        select: {
          publicDisplayName: true,
          professionalTitle: true,
          employee: { select: { firstName: true, lastName: true } },
          specialties: {
            orderBy: { isPrimary: "desc" },
            take: 1,
            select: { specialty: { select: { name: true } } },
          },
        },
      },
      diagnoses: {
        orderBy: [{ isPrimary: "desc" }, { recordedAt: "asc" }],
        select: { displayNameSnapshot: true, isPrimary: true },
      },
    },
  });

  return records.map((record) => {
    const doctor = record.doctor;
    const name = doctor.publicDisplayName?.trim() ||
      [doctor.employee.firstName, doctor.employee.lastName].filter(Boolean).join(" ") ||
      "Medical doctor";
    return {
      id: record.id,
      startedAt: record.startedAt.toISOString(),
      completedAt: record.completedAt?.toISOString() ?? null,
      doctor: { name, professionalTitle: doctor.professionalTitle, specialty: doctor.specialties[0]?.specialty.name ?? null },
      diagnoses: record.diagnoses.map((diagnosis) => ({ name: diagnosis.displayNameSnapshot, isPrimary: diagnosis.isPrimary })),
    };
  });
}

export async function getPatientVisitDetails(patientId: string, visitId: string) {
  const prisma = getPrismaClient();
  const record = await prisma.encounter.findFirst({
    where: { id: visitId, patientId, status: "COMPLETED" },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      doctor: {
        select: {
          publicDisplayName: true,
          professionalTitle: true,
          employee: { select: { firstName: true, lastName: true } },
          specialties: {
            orderBy: { isPrimary: "desc" },
            take: 1,
            select: { specialty: { select: { name: true } } },
          },
        },
      },
      diagnoses: {
        orderBy: [{ isPrimary: "desc" }, { recordedAt: "asc" }],
        select: { displayNameSnapshot: true, isPrimary: true },
      },
    },
  });

  if (!record) return null;
  const doctor = record.doctor;
  const name = doctor.publicDisplayName?.trim() ||
    [doctor.employee.firstName, doctor.employee.lastName].filter(Boolean).join(" ") ||
    "Medical doctor";
  return {
    id: record.id,
    startedAt: record.startedAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    doctor: {
      name,
      professionalTitle: doctor.professionalTitle,
      specialty: doctor.specialties[0]?.specialty.name ?? null,
    },
    diagnoses: record.diagnoses.map((diagnosis) => ({ name: diagnosis.displayNameSnapshot, isPrimary: diagnosis.isPrimary })),
  };
}
