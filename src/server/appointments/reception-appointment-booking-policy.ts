/**
 * Defense-in-depth policy for Reception appointment creation.
 * The Route Handler also requires the appointment.manage capability. The data
 * service rechecks the active employee and active RECEPTION assignment inside
 * its Serializable transaction so a stale or forged actor cannot create a row.
 */
export function isReceptionAppointmentActor(input: {
  employeeStatus: string;
  activeRoles: readonly string[];
}): boolean {
  return input.employeeStatus === "ACTIVE" && input.activeRoles.includes("RECEPTION");
}
