export type AuthorizationErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "ACTIVE_EMPLOYEE_REQUIRED"
  | "INSUFFICIENT_ROLE"
  | "INSUFFICIENT_PERMISSION"
  | "VERIFIED_PATIENT_ACCOUNT_REQUIRED"
  | "PATIENT_ACCESS_DENIED"
  | "INSUFFICIENT_WORKSPACE_ACCESS";

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;
  readonly status: 401 | 403;

  constructor(
    code: AuthorizationErrorCode,
    message: string,
    status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
    this.status = status;
  }
}

export function authorizationErrorResponse(error: AuthorizationError): Response {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    {
      status: error.status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        Pragma: "no-cache",
        Vary: "Cookie",
      },
    },
  );
}
