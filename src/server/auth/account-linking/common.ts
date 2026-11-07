import "server-only";

import { getBetterAuthEnvironment } from "../environment";

export class AccountLinkError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "AccountLinkError";
    this.code = code;
    this.status = status;
  }
}

/**
 * These endpoints mutate identity links and therefore accept only same-origin
 * browser requests protected by a validated Better Auth session. Authentication
 * and employee permission checks are applied by the shared route guard.
 */
export function assertAccountLinkOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const expectedOrigin = getBetterAuthEnvironment().baseURL;

  if (!origin || origin !== expectedOrigin) {
    throw new AccountLinkError(
      "INVALID_ORIGIN",
      "The request origin is not allowed.",
      403,
    );
  }
}

export function accountLinkJson(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Cookie, Origin",
    },
  });
}

export function toAccountLinkErrorResponse(error: unknown): Response {
  if (error instanceof AccountLinkError) {
    return accountLinkJson(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return accountLinkJson(
      {
        error: {
          code: "ACCOUNT_ALREADY_LINKED",
          message: "The account or clinic record is already linked.",
        },
      },
      409,
    );
  }

  return accountLinkJson(
    {
      error: {
        code: "ACCOUNT_LINK_FAILED",
        message: "The account-linking request could not be completed.",
      },
    },
    500,
  );
}
