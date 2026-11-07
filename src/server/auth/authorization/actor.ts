import "server-only";

import { getPrismaClient } from "../../db/client";
import { getAuthSession } from "../session";
import { AuthorizationError } from "./errors";
import { getEmployeePermissions, isEmployeeRole } from "./policy";
import type {
  ClinicPermission,
  CurrentAuthActor,
  EmployeeAuthorizationContext,
  EmployeeRole,
  PatientAuthorizationContext,
} from "./types";

/**
 * Resolve a Better Auth session into verified clinic identities.
 * No role, employee ID, or patient ID is accepted from the client.
 */
export async function getCurrentAuthActor(): Promise<CurrentAuthActor | null> {
  const session = await getAuthSession();
  if (!session) return null;

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      emailVerified: true,
      employeeAccount: {
        select: {
          verifiedAt: true,
          employee: {
            select: {
              id: true,
              status: true,
              roleAssignments: {
                where: { status: "ACTIVE" },
                select: { role: true },
              },
            },
          },
        },
      },
      patientAccount: {
        select: {
          verifiedAt: true,
          patient: {
            select: {
              id: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const employeeAccount = user.employeeAccount;
  const employeeIsAuthorized = Boolean(
    user.emailVerified &&
      employeeAccount?.verifiedAt &&
      employeeAccount.employee.status === "ACTIVE",
  );

  const patientAccount = user.patientAccount;
  const patientIsAuthorized = Boolean(
    user.emailVerified &&
      patientAccount?.verifiedAt &&
      patientAccount.patient.isActive,
  );

  const roles = employeeIsAuthorized && employeeAccount
    ? employeeAccount.employee.roleAssignments
        .map((assignment: { role: string }) => assignment.role)
        .filter((role: string): role is EmployeeRole => isEmployeeRole(role))
    : [];

  return {
    userId: session.user.id,
    emailVerified: user.emailVerified,
    employee:
      employeeIsAuthorized && employeeAccount
        ? {
            employeeId: employeeAccount.employee.id,
            roles,
          }
        : null,
    patient:
      patientIsAuthorized && patientAccount
        ? { patientId: patientAccount.patient.id }
        : null,
  };
}

export async function requireAuthenticatedActor(): Promise<CurrentAuthActor> {
  const actor = await getCurrentAuthActor();
  if (!actor) {
    throw new AuthorizationError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to continue.",
      401,
    );
  }

  return actor;
}

export async function requireEmployeeActor(): Promise<EmployeeAuthorizationContext> {
  const actor = await requireAuthenticatedActor();
  if (!actor.employee) {
    throw new AuthorizationError(
      "ACTIVE_EMPLOYEE_REQUIRED",
      "An active, verified employee account is required.",
      403,
    );
  }

  return {
    userId: actor.userId,
    employeeId: actor.employee.employeeId,
    roles: actor.employee.roles,
    permissions: getEmployeePermissions(actor.employee.roles),
  };
}

export async function requireEmployeeRole(
  allowedRoles: readonly EmployeeRole[],
): Promise<EmployeeAuthorizationContext> {
  const actor = await requireEmployeeActor();
  const hasAllowedRole = actor.roles.some((role) => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    throw new AuthorizationError(
      "INSUFFICIENT_ROLE",
      "Your employee role is not permitted to perform this action.",
      403,
    );
  }

  return actor;
}

export async function requireEmployeePermission(
  permission: ClinicPermission,
): Promise<EmployeeAuthorizationContext> {
  const actor = await requireEmployeeActor();

  if (!actor.permissions.includes(permission)) {
    throw new AuthorizationError(
      "INSUFFICIENT_PERMISSION",
      "You do not have permission to perform this action.",
      403,
    );
  }

  return actor;
}

export async function requirePatientActor(): Promise<PatientAuthorizationContext> {
  const actor = await requireAuthenticatedActor();
  if (!actor.patient) {
    throw new AuthorizationError(
      "VERIFIED_PATIENT_ACCOUNT_REQUIRED",
      "A verified, active patient account is required.",
      403,
    );
  }

  return {
    userId: actor.userId,
    patientId: actor.patient.patientId,
  };
}
