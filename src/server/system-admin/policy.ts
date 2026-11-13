import type { EmployeeRole } from "../auth/authorization/types";

export type SystemRoleAction = "GRANT" | "REVOKE";

export function getSystemRoleChangeBlocker(input: {
  action: SystemRoleAction;
  role: EmployeeRole;
  activeSystemAdminCount: number;
  targetEmployeeStatus: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  targetActiveRoles: readonly EmployeeRole[];
  targetHasVerifiedAccount: boolean;
}): string | null {
  if (input.action === "GRANT" && input.targetEmployeeStatus !== "ACTIVE") {
    return "Roles can only be granted to active employees.";
  }

  if (input.action === "GRANT" && input.role === "SYSTEM_ADMIN" && !input.targetHasVerifiedAccount) {
    return "Link and verify this employee account before granting System Admin access.";
  }

  if (input.action === "GRANT" && input.role === "SYSTEM_ADMIN" && input.targetActiveRoles.includes("CLINIC_MANAGER")) {
    return "Clinic Manager and System Admin must remain separate roles.";
  }

  if (input.action === "GRANT" && input.role === "CLINIC_MANAGER" && input.targetActiveRoles.includes("SYSTEM_ADMIN")) {
    return "Clinic Manager and System Admin must remain separate roles.";
  }

  if (input.action === "REVOKE" && input.role === "SYSTEM_ADMIN" && input.activeSystemAdminCount <= 1) {
    return "The last verified active System Admin assignment cannot be revoked.";
  }

  return null;
}
