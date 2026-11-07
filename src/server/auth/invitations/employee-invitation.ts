import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getPrismaClient } from "../../db/client";
import { getBetterAuthEnvironment } from "../environment";
import { AccountLinkError } from "../account-linking/common";
import { isAuthEmailDeliveryAvailable, sendAuthEmail } from "../email/email-delivery";
import { createEmployeeInvitationEmailContent } from "../email/employee-invitation-content";
import {
  createEmployeeInvitationState,
  createEmployeeInvitationToken,
  employeeInvitationVerificationIdentifier,
  isEmployeeInvitationTokenValid,
  normalizeInvitationEmail,
  parseEmployeeInvitationState,
  serializeEmployeeInvitationState,
} from "./employee-invitation-validation";

const EMPLOYEE_INVITATION_TTL_MS = 72 * 60 * 60 * 1000;
const workEmailSchema = z.string().trim().email().max(254);

function invalidInvitation(): AccountLinkError {
  return new AccountLinkError(
    "EMPLOYEE_INVITATION_INVALID",
    "This employee invitation is invalid, expired, or no longer available. Request a new invitation from the clinic administrator.",
    410,
  );
}

function buildEmployeeInvitationUrl(employeeId: string, token: string): string {
  const url = new URL("/auth/employee-invitation", getBetterAuthEnvironment().baseURL);
  url.searchParams.set("employeeId", employeeId);
  url.searchParams.set("token", token);
  return url.toString();
}

export interface EmployeeInvitationPreview {
  email: string;
  employeeName: string;
}

/** Issue or replace the single pending invitation for an existing active employee. */
export async function createEmployeeInvitation(
  input: { employeeId: string; reason: string },
  actorEmployeeId: string,
): Promise<{ email: string; expiresAt: Date }> {
  if (!isAuthEmailDeliveryAvailable()) {
    throw new AccountLinkError(
      "EMAIL_DELIVERY_UNAVAILABLE",
      "Authentication email delivery is not configured. No invitation was issued.",
      503,
    );
  }

  const prisma = getPrismaClient();
  const token = createEmployeeInvitationToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMPLOYEE_INVITATION_TTL_MS);
  const identifier = employeeInvitationVerificationIdentifier(input.employeeId);

  const invitation = await prisma.$transaction(async (transaction) => {
    const employee = await transaction.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, firstName: true, lastName: true, workEmail: true, status: true },
    });

    if (!employee || employee.status !== "ACTIVE" || !employee.workEmail) {
      throw new AccountLinkError(
        "ACTIVE_EMPLOYEE_WITH_WORK_EMAIL_REQUIRED",
        "An active employee with a work email address is required for an invitation.",
        409,
      );
    }

    const parsedEmail = workEmailSchema.safeParse(employee.workEmail);
    if (!parsedEmail.success) {
      throw new AccountLinkError(
        "EMPLOYEE_WORK_EMAIL_INVALID",
        "The employee work email address is invalid. Update the employee record before sending an invitation.",
        409,
      );
    }

    const email = normalizeInvitationEmail(parsedEmail.data);

    const existingLink = await transaction.employeeAccount.findUnique({
      where: { employeeId: employee.id },
      select: { id: true },
    });
    if (existingLink) {
      throw new AccountLinkError(
        "EMPLOYEE_ACCOUNT_ALREADY_LINKED",
        "This employee already has a linked sign-in account.",
        409,
      );
    }

    const existingIdentityLink = await transaction.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { employeeAccount: { select: { id: true } } },
    });
    if (existingIdentityLink?.employeeAccount) {
      throw new AccountLinkError(
        "SIGN_IN_IDENTITY_ALREADY_LINKED",
        "This work email is already linked to another employee record.",
        409,
      );
    }

    const state = createEmployeeInvitationState({
      employeeId: employee.id,
      invitedEmail: email,
      invitedByEmployeeId: actorEmployeeId,
      token,
    });

    await transaction.verification.deleteMany({ where: { identifier } });
    const verification = await transaction.verification.create({
      data: {
        id: randomUUID(),
        identifier,
        value: serializeEmployeeInvitationState(state),
        expiresAt,
      },
      select: { id: true },
    });

    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "EMPLOYEE_INVITATION_ISSUED",
        entityType: "Employee",
        entityId: employee.id,
        reason: input.reason,
        occurredAt: now,
      },
    });

    return {
      verificationId: verification.id,
      email,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
    };
  }, { isolationLevel: "Serializable" });

  try {
    const invitationUrl = buildEmployeeInvitationUrl(input.employeeId, token);
    const content = createEmployeeInvitationEmailContent(invitation.employeeName, invitationUrl);
    await sendAuthEmail({ to: invitation.email, ...content });
  } catch {
    await prisma.$transaction(async (transaction) => {
      await transaction.verification.deleteMany({ where: { id: invitation.verificationId } });
      await transaction.auditLog.create({
        data: {
          actorType: "EMPLOYEE",
          actorEmployeeId,
          action: "EMPLOYEE_INVITATION_DELIVERY_FAILED",
          entityType: "Employee",
          entityId: input.employeeId,
          reason: "Invitation email delivery failed; the pending token was removed.",
        },
      });
    });
    throw new AccountLinkError(
      "EMPLOYEE_INVITATION_DELIVERY_FAILED",
      "The invitation email could not be sent. No active invitation remains; check email delivery and try again.",
      503,
    );
  }

  return { email: invitation.email, expiresAt };
}


/** Validate an invitation link without changing state or exposing the employee record to arbitrary visitors. */
export async function getEmployeeInvitationPreview(
  employeeId: string,
  token: string,
): Promise<EmployeeInvitationPreview | null> {
  if (!employeeId || employeeId.length > 128 || token.length < 32 || token.length > 128) return null;

  const prisma = getPrismaClient();
  const record = await prisma.verification.findFirst({
    where: { identifier: employeeInvitationVerificationIdentifier(employeeId) },
    orderBy: { createdAt: "desc" },
    select: { value: true, expiresAt: true },
  });

  if (!record || record.expiresAt.getTime() <= Date.now()) return null;
  const state = parseEmployeeInvitationState(record.value);
  if (!state || state.employeeId !== employeeId || !isEmployeeInvitationTokenValid(state, token)) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { firstName: true, lastName: true, workEmail: true, status: true, authAccount: { select: { id: true } } },
  });

  if (
    !employee ||
    employee.status !== "ACTIVE" ||
    employee.authAccount ||
    !employee.workEmail ||
    normalizeInvitationEmail(employee.workEmail) !== state.invitedEmail
  ) {
    return null;
  }

  return {
    email: state.invitedEmail,
    employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
  };
}

/** Revoke a pending invitation; this never removes or modifies an existing account link. */
export async function revokeEmployeeInvitation(
  input: { employeeId: string; reason: string },
  actorEmployeeId: string,
): Promise<void> {
  const prisma = getPrismaClient();
  const identifier = employeeInvitationVerificationIdentifier(input.employeeId);

  await prisma.$transaction(async (transaction) => {
    const pending = await transaction.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!pending) {
      throw new AccountLinkError(
        "EMPLOYEE_INVITATION_NOT_FOUND",
        "There is no pending invitation for this employee.",
        404,
      );
    }

    await transaction.verification.deleteMany({ where: { identifier } });
    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "EMPLOYEE_INVITATION_REVOKED",
        entityType: "Employee",
        entityId: input.employeeId,
        reason: input.reason,
      },
    });
  }, { isolationLevel: "Serializable" });
}

/** Accept an invitation from a verified Better Auth identity matching the exact current employee work email. */
export async function acceptEmployeeInvitation(
  userId: string,
  input: { employeeId: string; token: string },
): Promise<void> {
  const prisma = getPrismaClient();
  const identifier = employeeInvitationVerificationIdentifier(input.employeeId);
  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user || !user.emailVerified) {
      throw new AccountLinkError(
        "VERIFIED_EMAIL_REQUIRED",
        "Verify the invited email address before accepting this employee invitation.",
        403,
      );
    }

    const pending = await transaction.verification.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
      select: { id: true, value: true, expiresAt: true },
    });
    if (!pending || pending.expiresAt.getTime() <= now.getTime()) throw invalidInvitation();

    const state = parseEmployeeInvitationState(pending.value);
    if (
      !state ||
      state.employeeId !== input.employeeId ||
      !isEmployeeInvitationTokenValid(state, input.token)
    ) {
      throw invalidInvitation();
    }

    const signedInEmail = normalizeInvitationEmail(user.email);
    if (signedInEmail !== state.invitedEmail) {
      throw new AccountLinkError(
        "INVITATION_EMAIL_MISMATCH",
        "Sign in with the verified email address that received this invitation.",
        403,
      );
    }

    const employee = await transaction.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, workEmail: true, status: true },
    });
    if (
      !employee ||
      employee.status !== "ACTIVE" ||
      !employee.workEmail ||
      normalizeInvitationEmail(employee.workEmail) !== state.invitedEmail
    ) {
      throw new AccountLinkError(
        "EMPLOYEE_INVITATION_NO_LONGER_MATCHES",
        "The employee record is no longer active or its work email has changed. Ask the clinic administrator to review the invitation.",
        409,
      );
    }

    const existingLink = await transaction.employeeAccount.findFirst({
      where: { OR: [{ userId: user.id }, { employeeId: employee.id }] },
      select: { id: true },
    });
    if (existingLink) {
      throw new AccountLinkError(
        "EMPLOYEE_ACCOUNT_ALREADY_LINKED",
        "The sign-in identity or employee record is already linked. Contact the clinic administrator if this appears incorrect.",
        409,
      );
    }

    const link = await transaction.employeeAccount.create({
      data: {
        userId: user.id,
        employeeId: employee.id,
        linkedByEmployeeId: state.invitedByEmployeeId,
        linkedAt: now,
        verifiedAt: now,
      },
      select: { id: true },
    });

    await transaction.verification.deleteMany({ where: { identifier } });
    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId: employee.id,
        action: "EMPLOYEE_INVITATION_ACCEPTED",
        entityType: "EmployeeAccount",
        entityId: link.id,
        reason: "Employee accepted a verified work-email invitation.",
        occurredAt: now,
      },
    });

  }, { isolationLevel: "Serializable" });
}
