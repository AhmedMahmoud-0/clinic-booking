import { canAccessEmployeeWorkspace } from "./workspace-policy";
import type { CurrentAuthActor, EmployeeWorkspace } from "./types";

export type PostSignInDestination =
  | {
      kind: "employee";
      workspace: EmployeeWorkspace;
      href: string;
      title: string;
      description: string;
    }
  | {
      kind: "patient";
      href: "/portal";
      title: "Patient portal";
      description: "Appointments, visits, and patient services available to your verified identity.";
    };

const EMPLOYEE_DESTINATIONS: readonly {
  workspace: EmployeeWorkspace;
  href: string;
  title: string;
  description: string;
}[] = [
  {
    workspace: "SYSTEM_ADMIN",
    href: "/system-admin",
    title: "System administration",
    description: "Technical accounts, roles, configuration, and system audit access.",
  },
  {
    workspace: "CLINIC_MANAGER",
    href: "/clinic-manager",
    title: "Clinic management",
    description: "Clinic operations, approvals, staff oversight, and management reports.",
  },
];

/**
 * Returns only destinations justified by the server-resolved, active actor.
 * This is navigation convenience only; every destination still runs its own
 * server-side workspace or patient authorization guard.
 */
export function getPostSignInDestinations(
  actor: CurrentAuthActor,
): PostSignInDestination[] {
  const employee = actor.employee;
  const employeeDestinations = employee
    ? EMPLOYEE_DESTINATIONS.filter(({ workspace }) =>
        canAccessEmployeeWorkspace(employee.roles, workspace),
      ).map((destination) => ({ kind: "employee" as const, ...destination }))
    : [];

  const patientDestination: PostSignInDestination[] = actor.patient
    ? [
        {
          kind: "patient",
          href: "/portal",
          title: "Patient portal",
          description:
            "Appointments, visits, and patient services available to your verified identity.",
        },
      ]
    : [];

  return [...employeeDestinations, ...patientDestination];
}
