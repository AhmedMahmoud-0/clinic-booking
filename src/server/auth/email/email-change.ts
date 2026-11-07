import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "../../../../generated/prisma/client";

import { getPrismaClient } from "../../db/client";
import { getBetterAuthEnvironment } from "../environment";
import { createEmailChangeCurrentApprovalContent, createEmailChangeNewAddressContent } from "./email-content";
import { isAuthEmailDeliveryAvailable, sendAuthEmail } from "./email-delivery";
import {
  createEmailChangeToken,
  createPendingEmailChange,
  emailChangeVerificationIdentifier,
  isEmailChangeTokenValid,
  normalizeEmailAddress,
  parsePendingEmailChange,
  serializePendingEmailChange,
  type EmailChangeStep,
  type PendingEmailChange,
} from "./email-change-validation";

const CURRENT_EMAIL_APPROVAL_TTL_MS = 15 * 60 * 1000;
const NEW_EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000;
type Transaction = Prisma.TransactionClient;

export class EmailChangeError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "EmailChangeError";
    this.code = code;
    this.status = status;
  }
}

function invalidLink(): EmailChangeError {
  return new EmailChangeError(
    "EMAIL_CHANGE_LINK_INVALID",
    "This email-change link is invalid or has expired. Start the process again from account security.",
    410,
  );
}

function buildEmailChangeUrl(step: "current" | "new", userId: string, token: string): string {
  const url = new URL("/auth/email-change", getBetterAuthEnvironment().baseURL);
  url.searchParams.set("step", step);
  url.searchParams.set("userId", userId);
  url.searchParams.set("token", token);
  return url.toString();
}

async function ensureEmailAvailable(
  transaction: Transaction,
  userId: string,
  newEmail: string,
  employeeId: string | null,
  patientId: string | null,
): Promise<void> {
  const [userConflict, employeeConflict, patientContactConflict] = await Promise.all([
    transaction.user.findFirst({
      where: {
        id: { not: userId },
        email: { equals: newEmail, mode: "insensitive" },
      },
      select: { id: true },
    }),
    transaction.employee.findFirst({
      where: {
        workEmail: { equals: newEmail, mode: "insensitive" },
        ...(employeeId ? { id: { not: employeeId } } : {}),
      },
      select: { id: true },
    }),
    transaction.patientContact.findFirst({
      where: {
        type: "EMAIL",
        normalizedValue: { equals: newEmail, mode: "insensitive" },
        ...(patientId ? { patientId: { not: patientId } } : {}),
      },
      select: { id: true },
    }),
  ]);

  if (userConflict || employeeConflict || patientContactConflict) {
    throw new EmailChangeError(
      "EMAIL_ALREADY_IN_USE",
      "This email address is already associated with another account or clinic record.",
      409,
    );
  }
}

async function writePendingState(
  transaction: Transaction,
  userId: string,
  state: PendingEmailChange,
  expiresAt: Date,
): Promise<void> {
  const identifier = emailChangeVerificationIdentifier(userId);
  await transaction.verification.deleteMany({ where: { identifier } });
  await transaction.verification.create({
    data: {
      id: randomUUID(),
      identifier,
      value: serializePendingEmailChange(state),
      expiresAt,
    },
  });
}

async function readAndValidatePendingState(
  transaction: Transaction,
  userId: string,
  token: string,
  expectedStep: EmailChangeStep,
): Promise<PendingEmailChange> {
  const pending = await transaction.verification.findFirst({
    where: { identifier: emailChangeVerificationIdentifier(userId) },
    select: { value: true, expiresAt: true },
  });

  if (!pending || pending.expiresAt.getTime() <= Date.now()) throw invalidLink();
  const state = parsePendingEmailChange(pending.value);
  if (!state || state.step !== expectedStep || !isEmailChangeTokenValid(state, token)) {
    throw invalidLink();
  }
  return state;
}

async function clearPendingState(userId: string): Promise<void> {
  await getPrismaClient().verification.deleteMany({
    where: { identifier: emailChangeVerificationIdentifier(userId) },
  });
}

/** Start the two-address email-change process for the currently signed-in identity. */
export async function requestEmailChange(userId: string, requestedEmail: string): Promise<void> {
  if (!isAuthEmailDeliveryAvailable()) {
    throw new EmailChangeError(
      "EMAIL_DELIVERY_UNAVAILABLE",
      "Email delivery is not configured. The email address was not changed.",
      503,
    );
  }

  const prisma = getPrismaClient();
  const newEmail = normalizeEmailAddress(requestedEmail);
  const prepared = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        employeeAccount: { select: { employeeId: true } },
        patientAccount: { select: { patientId: true } },
      },
    });

    if (!user || !user.emailVerified) {
      throw new EmailChangeError("VERIFIED_ACCOUNT_REQUIRED", "A verified sign-in account is required.", 403);
    }

    const currentEmail = normalizeEmailAddress(user.email);
    if (newEmail === currentEmail) {
      throw new EmailChangeError("EMAIL_UNCHANGED", "Enter an email address different from the current one.", 400);
    }

    const employeeId = user.employeeAccount?.employeeId ?? null;
    const patientId = user.patientAccount?.patientId ?? null;
    await ensureEmailAvailable(transaction, user.id, newEmail, employeeId, patientId);

    const token = createEmailChangeToken();
    const state = createPendingEmailChange({
      step: "CURRENT_EMAIL_APPROVAL",
      token,
      currentEmail,
      newEmail,
    });
    await writePendingState(
      transaction,
      user.id,
      state,
      new Date(Date.now() + CURRENT_EMAIL_APPROVAL_TTL_MS),
    );

    return { currentEmail, newEmail, token };
  }, { isolationLevel: "Serializable" });

  const content = createEmailChangeCurrentApprovalContent(
    buildEmailChangeUrl("current", userId, prepared.token),
    prepared.newEmail,
  );

  try {
    await sendAuthEmail({ to: prepared.currentEmail, ...content });
  } catch {
    await clearPendingState(userId).catch(() => undefined);
    throw new EmailChangeError(
      "EMAIL_DELIVERY_FAILED",
      "The confirmation email could not be sent. Your current email address is unchanged; try again.",
      503,
    );
  }
}

/** Approve the request from the current address and send verification to the new address. */
export async function approveCurrentEmailChange(userId: string, token: string): Promise<void> {
  if (!isAuthEmailDeliveryAvailable()) {
    throw new EmailChangeError("EMAIL_DELIVERY_UNAVAILABLE", "Email delivery is not available.", 503);
  }

  const prisma = getPrismaClient();
  const prepared = await prisma.$transaction(async (transaction) => {
    const state = await readAndValidatePendingState(
      transaction,
      userId,
      token,
      "CURRENT_EMAIL_APPROVAL",
    );
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
        employeeAccount: { select: { employeeId: true } },
        patientAccount: { select: { patientId: true } },
      },
    });

    if (!user || !user.emailVerified || normalizeEmailAddress(user.email) !== state.currentEmail) {
      throw invalidLink();
    }

    await ensureEmailAvailable(
      transaction,
      userId,
      state.newEmail,
      user.employeeAccount?.employeeId ?? null,
      user.patientAccount?.patientId ?? null,
    );

    const newToken = createEmailChangeToken();
    const nextState = createPendingEmailChange({
      step: "NEW_EMAIL_VERIFICATION",
      token: newToken,
      currentEmail: state.currentEmail,
      newEmail: state.newEmail,
    });
    await writePendingState(
      transaction,
      userId,
      nextState,
      new Date(Date.now() + NEW_EMAIL_VERIFICATION_TTL_MS),
    );

    return { newEmail: state.newEmail, token: newToken };
  }, { isolationLevel: "Serializable" });

  const content = createEmailChangeNewAddressContent(
    buildEmailChangeUrl("new", userId, prepared.token),
  );
  try {
    await sendAuthEmail({ to: prepared.newEmail, ...content });
  } catch {
    await clearPendingState(userId).catch(() => undefined);
    throw new EmailChangeError(
      "EMAIL_DELIVERY_FAILED",
      "The new-address verification email could not be sent. Your sign-in email is unchanged; start the process again.",
      503,
    );
  }
}

async function synchronizePatientEmail(
  transaction: Transaction,
  patientId: string,
  currentEmail: string,
  newEmail: string,
  verifiedAt: Date,
): Promise<void> {
  const oldContact = await transaction.patientContact.findFirst({
    where: {
      patientId,
      type: "EMAIL",
      normalizedValue: { equals: currentEmail, mode: "insensitive" },
    },
    select: { id: true, isPrimary: true },
  });
  const newContact = await transaction.patientContact.findFirst({
    where: {
      patientId,
      type: "EMAIL",
      normalizedValue: { equals: newEmail, mode: "insensitive" },
    },
    select: { id: true, isPrimary: true },
  });

  if (newContact) {
    await transaction.patientContact.update({
      where: { id: newContact.id },
      data: {
        value: newEmail,
        verifiedAt,
        isPrimary: newContact.isPrimary || Boolean(oldContact?.isPrimary),
      },
    });
    if (oldContact && oldContact.id !== newContact.id) {
      await transaction.patientContact.delete({ where: { id: oldContact.id } });
    }
    return;
  }

  if (oldContact) {
    await transaction.patientContact.update({
      where: { id: oldContact.id },
      data: { value: newEmail, normalizedValue: newEmail, verifiedAt },
    });
    return;
  }

  await transaction.patientContact.create({
    data: {
      patientId,
      type: "EMAIL",
      value: newEmail,
      normalizedValue: newEmail,
      isPrimary: false,
      verifiedAt,
    },
  });
}

/** Finalize only after both addresses have been confirmed; sync domain records atomically. */
export async function completeEmailChange(userId: string, token: string): Promise<void> {
  const prisma = getPrismaClient();

  await prisma.$transaction(async (transaction) => {
    const state = await readAndValidatePendingState(
      transaction,
      userId,
      token,
      "NEW_EMAIL_VERIFICATION",
    );
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.emailVerified || normalizeEmailAddress(user.email) !== state.currentEmail) {
      throw invalidLink();
    }

    const [employeeAccount, patientAccount] = await Promise.all([
      transaction.employeeAccount.findUnique({
        where: { userId },
        select: { employeeId: true, employee: { select: { workEmail: true } } },
      }),
      transaction.patientAccount.findUnique({
        where: { userId },
        select: { patientId: true },
      }),
    ]);

    const employeeId = employeeAccount?.employeeId ?? null;
    const patientId = patientAccount?.patientId ?? null;

    if (
      employeeAccount &&
      normalizeEmailAddress(employeeAccount.employee.workEmail ?? "") !== state.currentEmail
    ) {
      throw new EmailChangeError(
        "EMPLOYEE_EMAIL_SYNC_CONFLICT",
        "The linked employee work email no longer matches this sign-in email. Ask the System Admin to reconcile the employee record before changing the address.",
        409,
      );
    }

    await ensureEmailAvailable(transaction, userId, state.newEmail, employeeId, patientId);
    const now = new Date();

    await transaction.user.update({
      where: { id: userId },
      data: { email: state.newEmail, emailVerified: true },
    });

    if (employeeId) {
      await transaction.employee.update({
        where: { id: employeeId },
        data: { workEmail: state.newEmail },
      });
    }

    if (patientId) {
      await synchronizePatientEmail(
        transaction,
        patientId,
        state.currentEmail,
        state.newEmail,
        now,
      );
    }

    await transaction.auditLog.create({
      data: {
        actorType: "EXTERNAL",
        action: "USER_EMAIL_CHANGED",
        entityType: "User",
        entityId: userId,
        reason: "Self-service email change completed after current and new address verification.",
        occurredAt: now,
      },
    });

    await transaction.verification.deleteMany({
      where: { identifier: emailChangeVerificationIdentifier(userId) },
    });
    await transaction.session.deleteMany({ where: { userId } });
  }, { isolationLevel: "Serializable" });
}
