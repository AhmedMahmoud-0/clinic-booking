export class PatientContactConsentError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PatientContactConsentError";
    this.code = code;
    this.status = status;
  }
}
