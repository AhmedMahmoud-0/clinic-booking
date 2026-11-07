import { z } from "zod";

import {
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../auth/account-linking/common";
import { ClinicMasterDataError } from "./errors";

export function clinicMasterDataJson(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Vary: "Cookie, Origin",
    },
  });
}

export async function parseClinicMasterDataJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  assertAccountLinkOrigin(request);

  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ClinicMasterDataError(
      "JSON_REQUIRED",
      "Send the request as JSON.",
      415,
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ClinicMasterDataError(
      "INVALID_MASTER_DATA_REQUEST",
      "The clinic master-data details are invalid. Check the supplied fields and try again.",
      400,
    );
  }

  return parsed.data;
}

export function toClinicMasterDataErrorResponse(error: unknown): Response {
  if (error instanceof ClinicMasterDataError) {
    return clinicMasterDataJson(
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }

  if (error instanceof AccountLinkError) {
    return toAccountLinkErrorResponse(error);
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "P2002") {
      return clinicMasterDataJson(
        {
          error: {
            code: "MASTER_DATA_CONFLICT",
            message: "A record with the same unique code or name already exists.",
          },
        },
        409,
      );
    }

    if (error.code === "P2025") {
      return clinicMasterDataJson(
        { error: { code: "MASTER_DATA_NOT_FOUND", message: "The requested master-data record was not found." } },
        404,
      );
    }

    if (error.code === "P2003" || error.code === "P2014") {
      return clinicMasterDataJson(
        {
          error: {
            code: "MASTER_DATA_RELATIONSHIP_CONFLICT",
            message: "The requested change conflicts with an existing clinic relationship.",
          },
        },
        409,
      );
    }
  }

  return clinicMasterDataJson(
    {
      error: {
        code: "MASTER_DATA_OPERATION_FAILED",
        message: "The clinic master-data operation could not be completed.",
      },
    },
    500,
  );
}
