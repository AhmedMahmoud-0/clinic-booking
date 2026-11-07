import "server-only";

import { getPrismaClient } from "../../db/client";
import { AccountLinkError } from "./common";
import { z } from "zod";
import { employeeAccountLinkSchema } from "./validation";

type EmployeeAccountLinkInput = z.infer<typeof employeeAccountLinkSchema>;

/** Link an existing, verified Better Auth identity to an active clinic employee. */
export async function linkEmployeeAccount(
  input: EmployeeAccountLinkInput,
  actorEmployeeId: string,
): Promise<{ employeeNumber: string }> {
  const prisma = getPrismaClient();
  const email = input.email.trim().toLowerCase();

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      throw new AccountLinkError(
        "VERIFIED_AUTH_IDENTITY_REQUIRED",
        "A verified sign-in identity for this email address is required.",
        409,
      );
    }

    const employee = await transaction.employee.findUnique({
      where: { id: input.employeeId },
      select: {
        id: true,
        employeeNumber: true,
        workEmail: true,
        status: true,
      },
    });

    if (
      !employee ||
      employee.status !== "ACTIVE" ||
      !employee.workEmail ||
      employee.workEmail.trim().toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new AccountLinkError(
        "EMPLOYEE_IDENTITY_MISMATCH",
        "The verified sign-in email does not match an active employee work email.",
        409,
      );
    }

    const existingLink = await transaction.employeeAccount.findFirst({
      where: {
        OR: [{ userId: user.id }, { employeeId: employee.id }],
      },
      select: { id: true },
    });

    if (existingLink) {
      throw new AccountLinkError(
        "EMPLOYEE_ACCOUNT_ALREADY_LINKED",
        "The sign-in identity or employee record is already linked.",
        409,
      );
    }

    const now = new Date();
    const link = await transaction.employeeAccount.create({
      data: {
        userId: user.id,
        employeeId: employee.id,
        linkedByEmployeeId: actorEmployeeId,
        linkedAt: now,
        verifiedAt: now,
      },
      select: { id: true },
    });

    await transaction.auditLog.create({
      data: {
        actorType: "EMPLOYEE",
        actorEmployeeId,
        action: "EMPLOYEE_ACCOUNT_LINKED",
        entityType: "EmployeeAccount",
        entityId: link.id,
        reason: input.reason,
        occurredAt: now,
      },
    });

    return { employeeNumber: employee.employeeNumber };
  });
}
