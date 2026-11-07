import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const employeeInvitationRequestSchema = z.object({
  employeeId: z.string().trim().min(1).max(128),
  reason: z.string().trim().min(5).max(500),
});

export const employeeInvitationRevokeSchema = z.object({
  employeeId: z.string().trim().min(1).max(128),
  reason: z.string().trim().min(5).max(500),
});

export const employeeInvitationAcceptSchema = z.object({
  employeeId: z.string().trim().min(1).max(128),
  token: z.string().trim().min(32).max(128),
});

const employeeInvitationStateSchema = z.object({
  version: z.literal(1),
  employeeId: z.string().min(1).max(128),
  invitedEmail: z.string().email().max(254),
  invitedByEmployeeId: z.string().min(1).max(128),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type EmployeeInvitationState = z.infer<typeof employeeInvitationStateSchema>;

export function normalizeInvitationEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function createEmployeeInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEmployeeInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createEmployeeInvitationState(input: {
  employeeId: string;
  invitedEmail: string;
  invitedByEmployeeId: string;
  token: string;
}): EmployeeInvitationState {
  return {
    version: 1,
    employeeId: input.employeeId,
    invitedEmail: normalizeInvitationEmail(input.invitedEmail),
    invitedByEmployeeId: input.invitedByEmployeeId,
    tokenHash: hashEmployeeInvitationToken(input.token),
  };
}

export function serializeEmployeeInvitationState(state: EmployeeInvitationState): string {
  return JSON.stringify(state);
}

export function parseEmployeeInvitationState(value: string): EmployeeInvitationState | null {
  try {
    const parsed: unknown = JSON.parse(value);
    const result = employeeInvitationStateSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function isEmployeeInvitationTokenValid(
  state: EmployeeInvitationState,
  token: string,
): boolean {
  const storedHash = Buffer.from(state.tokenHash, "hex");
  const candidateHash = Buffer.from(hashEmployeeInvitationToken(token), "hex");
  return storedHash.length === candidateHash.length && timingSafeEqual(storedHash, candidateHash);
}

export function employeeInvitationVerificationIdentifier(employeeId: string): string {
  return `meruno:employee-invitation:${employeeId}`;
}
