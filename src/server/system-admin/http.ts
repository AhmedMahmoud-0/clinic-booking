import { z } from "zod";
import {
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../auth/account-linking/common";

export class SystemAdminError extends Error {
  constructor(readonly code: string, message: string, readonly status = 409) {
    super(message);
    this.name = "SystemAdminError";
  }
}

export function systemAdminJson(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Cookie, Origin",
    },
  });
}

export async function parseSystemAdminJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  assertAccountLinkOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new SystemAdminError("JSON_REQUIRED", "Send the request as JSON.", 415);
  }
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new SystemAdminError("INVALID_SYSTEM_ADMIN_REQUEST", "The supplied administration details are invalid.", 400);
  }
  return parsed.data;
}

export function toSystemAdminErrorResponse(error: unknown): Response {
  if (error instanceof SystemAdminError) {
    return systemAdminJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  if (error instanceof AccountLinkError) return toAccountLinkErrorResponse(error);
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "P2002") return systemAdminJson({ error: { code: "SYSTEM_ADMIN_CONFLICT", message: "The requested assignment conflicts with an existing record." } }, 409);
    if (error.code === "P2025") return systemAdminJson({ error: { code: "SYSTEM_ADMIN_NOT_FOUND", message: "The requested employee or assignment was not found." } }, 404);
  }
  return systemAdminJson({ error: { code: "SYSTEM_ADMIN_OPERATION_FAILED", message: "The system administration operation could not be completed." } }, 500);
}
