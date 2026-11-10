export class PatientRelationshipError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "PatientRelationshipError";
    this.code = code;
    this.status = status;
  }
}
