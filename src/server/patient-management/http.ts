import { z } from "zod";

import {
  AccountLinkError,
  assertAccountLinkOrigin,
  toAccountLinkErrorResponse,
} from "../auth/account-linking/common";
import { PatientManagementError } from "./errors";

export function patientManagementJson(
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

export async function parsePatientManagementJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  assertAccountLinkOrigin(request);

  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new PatientManagementError("JSON_REQUIRED", "Send the request as JSON.", 415);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new PatientManagementError(
      "INVALID_PATIENT_REQUEST",
      "The patient registration details are invalid. Check the supplied fields and try again.",
      400,
    );
  }

  return parsed.data;
}

export function toPatientManagementErrorResponse(error: unknown): Response {
  if (error instanceof PatientManagementError) {
    return patientManagementJson(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.candidates ? { candidates: error.candidates } : {}),
        },
      },
      error.status,
    );
  }

  if (error instanceof AccountLinkError) return toAccountLinkErrorResponse(error);

  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "P2002") {
      return patientManagementJson(
        {
          error: {
            code: "PATIENT_MRN_CONFLICT",
            message: "A unique medical record number could not be reserved. Retry the registration request.",
          },
        },
        409,
      );
    }

    if (error.code === "P2034") {
      return patientManagementJson(
        {
          error: {
            code: "PATIENT_REGISTRATION_CONCURRENT_CHANGE",
            message: "Patient records changed during duplicate checking. Run the duplicate check again before retrying.",
          },
        },
        409,
      );
    }

    if (error.code === "P2003" || error.code === "P2014") {
      return patientManagementJson(
        {
          error: {
            code: "PATIENT_RELATIONSHIP_CONFLICT",
            message: "The patient record could not be created because a related record changed.",
          },
        },
        409,
      );
    }
  }

  return patientManagementJson(
    {
      error: {
        code: "PATIENT_OPERATION_FAILED",
        message: "The patient registration request could not be completed.",
      },
    },
    500,
  );
}
