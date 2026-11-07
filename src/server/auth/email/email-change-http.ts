import "server-only";

import { getBetterAuthEnvironment } from "../environment";
import { EmailChangeError } from "./email-change";

export function assertEmailChangeOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== getBetterAuthEnvironment().baseURL) {
    throw new EmailChangeError("INVALID_ORIGIN", "The request origin is not allowed.", 403);
  }
}

export function emailChangeJson(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Cookie, Origin",
    },
  });
}

export function toEmailChangeErrorResponse(error: unknown): Response {
  if (error instanceof EmailChangeError) {
    return emailChangeJson({ error: { code: error.code, message: error.message } }, error.status);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2002" || error.code === "P2034")
  ) {
    return emailChangeJson(
      {
        error: {
          code: "EMAIL_CHANGE_CONFLICT",
          message: "The email change conflicted with another update. Start the process again.",
        },
      },
      409,
    );
  }

  return emailChangeJson(
    { error: { code: "EMAIL_CHANGE_FAILED", message: "The email change could not be completed." } },
    500,
  );
}

export function assertEmailChangeJsonRequest(request: Request): void {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new EmailChangeError("JSON_REQUIRED", "Send the request as JSON.", 415);
  }
}
