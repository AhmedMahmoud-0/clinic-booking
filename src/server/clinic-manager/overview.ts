import "server-only";

import { getPrismaClient } from "../db/client";
import { getCairoDayWindow, summarizeStaffRoles } from "./overview-policy";

/**
 * Manager-facing operational aggregates only. No patient names, medical notes,
 * diagnoses, result values, report text, or individual clinical records leave
 * this read model.
 */
export async function getClinicManagerOverview(now: Date = new Date()) {
  const prisma = getPrismaClient();
  const period = getCairoDayWindow(now);

  const [appointmentsToday, cancelledAppointmentsToday, noShowsToday, activeClinicQueue, completedVisitsToday, pendingLabReviews, pendingRadiologyApprovals] = await Promise.all([
    prisma.appointment.count({
      where: { startsAt: { gte: period.startsAt, lt: period.endsAt } },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: period.startsAt, lt: period.endsAt }, status: "CANCELLED" },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: period.startsAt, lt: period.endsAt }, status: "NO_SHOW" },
    }),
    prisma.queueEntry.count({
      where: {
        queueDate: period.queueDate,
        status: { in: ["WAITING", "CALLED", "IN_SERVICE"] },
      },
    }),
    prisma.encounter.count({
      where: {
        status: "COMPLETED",
        completedAt: { gte: period.startsAt, lt: period.endsAt },
      },
    }),
    prisma.labResult.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.radiologyReport.count({ where: { status: "PENDING_APPROVAL" } }),
  ]);

  return {
    period: { date: period.date, timeZone: "Africa/Cairo" },
    metrics: {
      appointmentsToday,
      cancelledAppointmentsToday,
      noShowsToday,
      activeClinicQueue,
      completedVisitsToday,
      pendingLabReviews,
      pendingRadiologyApprovals,
    },
  };
}

/**
 * Staff oversight is intentionally limited to employment status, employee
 * number, display name, and active role assignments. Contact and auth-account
 * details are not returned to the operational manager workspace.
 */
export async function getClinicManagerStaffOverview() {
  const prisma = getPrismaClient();
  const [activeEmployees, employeesOnLeave, inactiveEmployees, total, employees] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count({ where: { status: "ON_LEAVE" } }),
    prisma.employee.count({ where: { status: "INACTIVE" } }),
    prisma.employee.count(),
    prisma.employee.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 100,
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        status: true,
        roleAssignments: {
          where: { status: "ACTIVE" },
          select: { role: true },
          orderBy: { role: "asc" },
        },
      },
    }),
  ]);

  const items = employees.map((employee) => ({
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    displayName: `${employee.firstName} ${employee.lastName}`.trim(),
    status: employee.status,
    roles: employee.roleAssignments.map((assignment) => assignment.role),
  }));

  return {
    counts: { activeEmployees, employeesOnLeave, inactiveEmployees, totalEmployees: total },
    roleCounts: summarizeStaffRoles(items),
    items,
    limit: 100,
    hasMore: total > items.length,
  };
}
