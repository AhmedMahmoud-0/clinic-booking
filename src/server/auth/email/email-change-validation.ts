import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const emailChangeRequestSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email().max(254),
});

export const emailChangeTokenSchema = z.object({
  userId: z.string().trim().min(1).max(128),
  token: z.string().trim().min(32).max(128),
});

const pendingEmailChangeSchema = z.object({
  version: z.literal(1),
  step: z.enum(["CURRENT_EMAIL_APPROVAL", "NEW_EMAIL_VERIFICATION"]),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  currentEmail: z.string().email().max(254),
  newEmail: z.string().email().max(254),
});

export type PendingEmailChange = z.infer<typeof pendingEmailChangeSchema>;
export type EmailChangeStep = PendingEmailChange["step"];

export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function createEmailChangeToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashEmailChangeToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createPendingEmailChange(input: {
  step: EmailChangeStep;
  token: string;
  currentEmail: string;
  newEmail: string;
}): PendingEmailChange {
  return {
    version: 1,
    step: input.step,
    tokenHash: hashEmailChangeToken(input.token),
    currentEmail: normalizeEmailAddress(input.currentEmail),
    newEmail: normalizeEmailAddress(input.newEmail),
  };
}

export function serializePendingEmailChange(state: PendingEmailChange): string {
  return JSON.stringify(state);
}

export function parsePendingEmailChange(value: string): PendingEmailChange | null {
  try {
    const parsed: unknown = JSON.parse(value);
    const result = pendingEmailChangeSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function isEmailChangeTokenValid(state: PendingEmailChange, token: string): boolean {
  const storedHash = Buffer.from(state.tokenHash, "hex");
  const candidateHash = Buffer.from(hashEmailChangeToken(token), "hex");
  return storedHash.length === candidateHash.length && timingSafeEqual(storedHash, candidateHash);
}

export function emailChangeVerificationIdentifier(userId: string): string {
  return `meruno:email-change:${userId}`;
}
