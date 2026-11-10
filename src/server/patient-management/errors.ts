import type { PatientDuplicateCandidate } from "./validation";

export class PatientManagementError extends Error {
  readonly code: string;
  readonly status: number;
  readonly candidates?: PatientDuplicateCandidate[];

  constructor(
    code: string,
    message: string,
    status: number,
    candidates?: PatientDuplicateCandidate[],
  ) {
    super(message);
    this.name = "PatientManagementError";
    this.code = code;
    this.status = status;
    this.candidates = candidates;
  }
}
