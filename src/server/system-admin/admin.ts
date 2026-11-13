import "server-only";

import type { Prisma } from "../../../generated/prisma/client";
import { EMPLOYEE_ROLES, type EmployeeRole } from "../auth/authorization/types";
import { ROLE_PERMISSIONS } from "../auth/authorization/policy";
import { getPrismaClient } from "../db/client";
import { getSystemRoleChangeBlocker, type SystemRoleAction } from "./policy";
import { SystemAdminError } from "./http";
import type { EmployeeRoleChangeInput } from "./validation";

type Tx = Prisma.TransactionClient;

export async function getSystemAdminOverview() {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalEmployees, activeEmployees, linkedEmployees, activeRoleAssignments, specialties, doctors, services, recentAuditEvents] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employeeAccount.count({ where: { verifiedAt: { not: null } } }),
    prisma.employeeRoleAssignment.count({ where: { status: "ACTIVE" } }),
    prisma.specialty.count(),
    prisma.doctorProfile.count(),
    prisma.serviceCatalog.count(),
    prisma.auditLog.count({ where: { occurredAt: { gte: since } } }),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    counts: { totalEmployees, activeEmployees, linkedEmployees, activeRoleAssignments, specialties, doctors, services, auditEventsLast24Hours: recentAuditEvents },
  };
}

export async function getSystemAdminUsers() {
  const prisma = getPrismaClient();
  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 100,
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        workEmail: true,
        status: true,
        authAccount: { select: { linkedAt: true, verifiedAt: true, user: { select: { email: true, emailVerified: true } } } },
        roleAssignments: {
          orderBy: [{ role: "asc" }],
          select: { role: true, status: true, grantedAt: true, revokedAt: true, reason: true },
        },
      },
    }),
    prisma.employee.count(),
  ]);
  return {
    items: employees.map((employee) => ({
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      displayName: `${employee.firstName} ${employee.lastName}`.trim(),
      status: employee.status,
      workEmail: employee.workEmail,
      account: employee.authAccount ? {
        email: employee.authAccount.user.email,
        emailVerified: employee.authAccount.user.emailVerified,
        linkedAt: employee.authAccount.linkedAt.toISOString(),
        linkVerified: employee.authAccount.verifiedAt !== null,
      } : null,
      roles: employee.roleAssignments.map((assignment) => ({
        role: assignment.role,
        status: assignment.status,
        grantedAt: assignment.grantedAt.toISOString(),
        revokedAt: assignment.revokedAt?.toISOString() ?? null,
        reason: assignment.reason,
      })),
    })),
    limit: 100,
    total,
    hasMore: total > employees.length,
  };
}

export function getSystemAdminRoleCatalog() {
  return EMPLOYEE_ROLES.map((role) => ({
    role,
    permissions: [...ROLE_PERMISSIONS[role]],
    permissionCount: ROLE_PERMISSIONS[role].length,
    isTechnicalAdminRole: role === "SYSTEM_ADMIN",
  }));
}

export async function changeEmployeeRoleAssignment(
  employeeId: string,
  actorEmployeeId: string,
  input: EmployeeRoleChangeInput,
) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx: Tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        status: true,
        authAccount: { select: { verifiedAt: true, user: { select: { emailVerified: true } } } },
        roleAssignments: { where: { status: "ACTIVE" }, select: { role: true } },
      },
    });
    if (!employee) throw new SystemAdminError("EMPLOYEE_NOT_FOUND", "The employee was not found.", 404);

    const existing = await tx.employeeRoleAssignment.findUnique({
      where: { employeeId_role: { employeeId, role: input.role } },
      select: { id: true, status: true },
    });

    if (input.action === "GRANT" && existing?.status === "ACTIVE") {
      throw new SystemAdminError("ROLE_ALREADY_ASSIGNED", "This employee already has the selected active role.", 409);
    }
    if (input.action === "REVOKE" && existing?.status !== "ACTIVE") {
      throw new SystemAdminError("ACTIVE_ROLE_NOT_FOUND", "The employee does not have this active role.", 404);
    }

    const activeSystemAdminCount = input.role === "SYSTEM_ADMIN" && input.action === "REVOKE"
      ? await tx.employeeRoleAssignment.count({
          where: {
            role: "SYSTEM_ADMIN",
            status: "ACTIVE",
            employee: { is: { status: "ACTIVE", authAccount: { is: { verifiedAt: { not: null }, user: { is: { emailVerified: true } } } } } },
          },
        })
      : 0;

    const blocker = getSystemRoleChangeBlocker({
      action: input.action as SystemRoleAction,
      role: input.role as EmployeeRole,
      activeSystemAdminCount,
      targetEmployeeStatus: employee.status,
      targetActiveRoles: employee.roleAssignments.map((assignment) => assignment.role),
      targetHasVerifiedAccount: Boolean(employee.authAccount?.verifiedAt && employee.authAccount.user.emailVerified),
    });
    if (blocker) throw new SystemAdminError("ROLE_CHANGE_BLOCKED", blocker, 409);

    const now = new Date();
    const assignment = input.action === "GRANT"
      ? existing
        ? await tx.employeeRoleAssignment.update({
            where: { employeeId_role: { employeeId, role: input.role } },
            data: { status: "ACTIVE", grantedByEmployeeId: actorEmployeeId, revokedByEmployeeId: null, reason: input.reason, grantedAt: now, revokedAt: null },
            select: { id: true, employeeId: true, role: true, status: true, grantedAt: true, revokedAt: true, reason: true },
          })
        : await tx.employeeRoleAssignment.create({
            data: { employeeId, role: input.role, status: "ACTIVE", grantedByEmployeeId: actorEmployeeId, reason: input.reason },
            select: { id: true, employeeId: true, role: true, status: true, grantedAt: true, revokedAt: true, reason: true },
          })
      : await tx.employeeRoleAssignment.update({
          where: { employeeId_role: { employeeId, role: input.role } },
          data: { status: "REVOKED", revokedByEmployeeId: actorEmployeeId, revokedAt: now, reason: input.reason },
          select: { id: true, employeeId: true, role: true, status: true, grantedAt: true, revokedAt: true, reason: true },
        });

    await tx.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: input.action === "GRANT" ? "SYSTEM_ROLE_GRANTED" : "SYSTEM_ROLE_REVOKED",
        entityType: "EmployeeRoleAssignment",
        entityId: assignment.id,
        reason: `${input.role}: ${input.reason}`.slice(0, 500),
      },
    });
    return {
      id: assignment.id,
      employeeId: assignment.employeeId,
      role: assignment.role,
      status: assignment.status,
      grantedAt: assignment.grantedAt.toISOString(),
      revokedAt: assignment.revokedAt?.toISOString() ?? null,
      reason: assignment.reason,
    };
  }, { isolationLevel: "Serializable" });
}

export async function getSystemAdminAuditLogs(query: { q?: string; limit: number }) {
  const prisma = getPrismaClient();
  const term = query.q?.trim();
  const where: Prisma.AuditLogWhereInput = {
    // Technical/admin and clinic catalog events only. Do not expose audit
    // entries tied to patients, appointments, encounters, or diagnostics.
    entityType: { in: ["EmployeeRoleAssignment", "EmployeeAccount", "Specialty", "DoctorProfile", "ServiceCatalog", "DoctorService"] },
    ...(term ? {
      OR: [
        { action: { contains: term, mode: "insensitive" as const } },
        { entityType: { contains: term, mode: "insensitive" as const } },
        { entityId: { contains: term, mode: "insensitive" as const } },
        { reason: { contains: term, mode: "insensitive" as const } },
      ],
    } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: query.limit,
      select: {
        id: true, actorType: true, action: true, entityType: true, entityId: true, reason: true, occurredAt: true,
        actorEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    items: items.map((item) => ({
      id: item.id,
      actorType: item.actorType,
      actor: item.actorEmployee ? `${item.actorEmployee.firstName} ${item.actorEmployee.lastName}`.trim() : null,
      actorEmployeeNumber: item.actorEmployee?.employeeNumber ?? null,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      reason: item.reason,
      occurredAt: item.occurredAt.toISOString(),
    })),
    limit: query.limit,
    total,
    hasMore: total > items.length,
  };
}

export async function getSystemAdminSchedules() {
  const prisma = getPrismaClient();
  const [clinicSchedules, doctorSchedules, clinicExceptions, doctorExceptions] = await Promise.all([
    prisma.clinicWeeklySchedule.findMany({
      where: { isActive: true },
      orderBy: [{ weekday: "asc" }, { startMinuteOfDay: "asc" }],
      take: 100,
      select: { id: true, weekday: true, startMinuteOfDay: true, endMinuteOfDay: true, effectiveFrom: true, effectiveUntil: true, isActive: true },
    }),
    prisma.doctorWeeklySchedule.findMany({
      where: { isActive: true },
      orderBy: [{ weekday: "asc" }, { startMinuteOfDay: "asc" }],
      take: 200,
      select: {
        id: true, weekday: true, startMinuteOfDay: true, endMinuteOfDay: true, effectiveFrom: true, effectiveUntil: true,
        doctor: { select: { employee: { select: { employeeNumber: true, firstName: true, lastName: true, status: true } } } },
      },
    }),
    prisma.clinicScheduleException.findMany({
      where: { endsAt: { gte: new Date() } },
      orderBy: [{ startsAt: "asc" }],
      take: 50,
      select: { id: true, type: true, startsAt: true, endsAt: true, reason: true },
    }),
    prisma.doctorScheduleException.findMany({
      where: { endsAt: { gte: new Date() } },
      orderBy: [{ startsAt: "asc" }],
      take: 100,
      select: {
        id: true, type: true, startsAt: true, endsAt: true, reason: true,
        doctor: { select: { employee: { select: { employeeNumber: true, firstName: true, lastName: true } } } },
      },
    }),
  ]);
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return {
    clinicSchedules: clinicSchedules.map((item) => ({ ...item, startTime: format(item.startMinuteOfDay), endTime: format(item.endMinuteOfDay), effectiveFrom: item.effectiveFrom.toISOString().slice(0, 10), effectiveUntil: item.effectiveUntil?.toISOString().slice(0, 10) ?? null })),
    doctorSchedules: doctorSchedules.map((item) => ({
      id: item.id, weekday: item.weekday, startTime: format(item.startMinuteOfDay), endTime: format(item.endMinuteOfDay),
      effectiveFrom: item.effectiveFrom.toISOString().slice(0, 10), effectiveUntil: item.effectiveUntil?.toISOString().slice(0, 10) ?? null,
      employeeNumber: item.doctor.employee.employeeNumber,
      doctorName: `${item.doctor.employee.firstName} ${item.doctor.employee.lastName}`.trim(),
      employeeStatus: item.doctor.employee.status,
    })),
    upcomingExceptions: [
      ...clinicExceptions.map((item) => ({
        id: item.id, scope: "CLINIC" as const, type: item.type,
        startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), reason: item.reason,
        employeeNumber: null, doctorName: "Clinic",
      })),
      ...doctorExceptions.map((item) => ({
        id: item.id, scope: "DOCTOR" as const, type: item.type,
        startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), reason: item.reason,
        employeeNumber: item.doctor.employee.employeeNumber,
        doctorName: `${item.doctor.employee.firstName} ${item.doctor.employee.lastName}`.trim(),
      })),
    ].sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    timeZone: "Africa/Cairo",
  };
}
