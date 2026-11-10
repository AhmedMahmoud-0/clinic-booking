export type PatientConsentDecisionValue = "GRANTED" | "REFUSED" | "WITHDRAWN";
export type PatientConsentSignerTypeValue = "PATIENT" | "LEGAL_GUARDIAN";

/** Age is calculated at the clinic-local date; null DOB remains unknown, never assumed adult. */
export function calculatePatientAgeAtDateOfBirth(
  dateOfBirth: Date | null,
  clinicDate: string,
): number | null {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(clinicDate)) return null;
  const birth = dateOfBirth.toISOString().slice(0, 10);
  const [birthYear, birthMonth, birthDay] = birth.split("-").map(Number);
  const [year, month, day] = clinicDate.split("-").map(Number);
  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age;
}

export function resolvePatientConsentSignerType(input: {
  subjectPatientId: string;
  signerPatientId: string;
  age: number | null;
  hasVerifiedLegalGuardianRelationship: boolean;
}): PatientConsentSignerTypeValue | null {
  if (input.age === null || input.age < 0) return null;
  if (input.age >= 18) {
    return input.signerPatientId === input.subjectPatientId ? "PATIENT" : null;
  }
  if (input.signerPatientId !== input.subjectPatientId && input.hasVerifiedLegalGuardianRelationship) {
    return "LEGAL_GUARDIAN";
  }
  return null;
}

/** Withdrawal is an event and is valid only when the most recent decision granted consent. */
export function canRecordPatientConsentDecision(
  currentDecision: PatientConsentDecisionValue | null,
  nextDecision: PatientConsentDecisionValue,
): boolean {
  return nextDecision !== "WITHDRAWN" || currentDecision === "GRANTED";
}
