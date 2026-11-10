export class AppointmentAvailabilityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AppointmentAvailabilityError";
    this.code = code;
    this.status = status;
  }
}
