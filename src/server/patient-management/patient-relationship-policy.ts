/**
 * A staff-verified legal-guardian relationship in this clinic workflow is for
 * a minor patient. Missing, invalid, or future dates fail closed.
 */
export function isEligibleForLegalGuardianVerification(
  dateOfBirth: Date | null,
  clinicDate: string,
): boolean {
  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime())) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clinicDate)) return false;

  const birthDate = dateOfBirth.toISOString().slice(0, 10);
  const parsedClinicDate = new Date(`${clinicDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedClinicDate.getTime()) ||
    parsedClinicDate.toISOString().slice(0, 10) !== clinicDate ||
    birthDate > clinicDate
  ) {
    return false;
  }

  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [year, month, day] = clinicDate.split("-").map(Number);
  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age >= 0 && age < 18;
}
