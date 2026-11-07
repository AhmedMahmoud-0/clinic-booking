import { z } from "zod";

import { PATIENT_ACCESS_SCOPES } from "../authorization/types";

const patientIdSchema = z.string().trim().min(1).max(128);
const reasonSchema = z.string().trim().min(5).max(120);
const expirySchema = z.string().trim().refine(
  (value) =>
    Number.isFinite(Date.parse(value)) &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value),
  "Use an ISO 8601 date-time with an explicit timezone.",
);

const scopesSchema = z
  .array(z.enum(PATIENT_ACCESS_SCOPES))
  .min(1)
  .max(PATIENT_ACCESS_SCOPES.length)
  .refine((scopes) => new Set(scopes).size === scopes.length, {
    message: "Each patient access scope may be selected only once.",
  });

export const createPatientDelegationSchema = z
  .object({
    subjectPatientId: patientIdSchema,
    granteePatientId: patientIdSchema,
    scopes: scopesSchema,
    expiresAt: expirySchema,
    reason: reasonSchema,
  })
  .strict()
  .refine((value) => value.subjectPatientId !== value.granteePatientId, {
    message: "A patient cannot delegate access to their own record.",
    path: ["granteePatientId"],
  });

export const updatePatientDelegationSchema = z
  .object({
    scopes: scopesSchema,
    expiresAt: expirySchema,
    reason: reasonSchema,
  })
  .strict();

export const patientDelegationDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().max(120).optional(),
  })
  .strict();

export const patientDelegationRevokeSchema = z
  .object({ reason: reasonSchema })
  .strict();

export type CreatePatientDelegationInput = z.infer<typeof createPatientDelegationSchema>;
export type UpdatePatientDelegationInput = z.infer<typeof updatePatientDelegationSchema>;
export type PatientDelegationDecisionInput = z.infer<typeof patientDelegationDecisionSchema>;
export type PatientDelegationRevokeInput = z.infer<typeof patientDelegationRevokeSchema>;

export const MAX_PATIENT_DELEGATION_DAYS = 365;

/** Require a finite grant term: strictly future and no longer than one year. */
export function isPatientDelegationExpiryAllowed(
  expiresAt: Date,
  now: Date,
): boolean {
  const expiryTime = expiresAt.getTime();
  const nowTime = now.getTime();
  const maximumTime = nowTime + MAX_PATIENT_DELEGATION_DAYS * 24 * 60 * 60 * 1000;

  return (
    Number.isFinite(expiryTime) &&
    Number.isFinite(nowTime) &&
    expiryTime > nowTime &&
    expiryTime <= maximumTime
  );
}
