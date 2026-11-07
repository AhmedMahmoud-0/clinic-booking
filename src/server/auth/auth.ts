import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { getPrismaClient } from "../db/client";
import { getBetterAuthEnvironment } from "./environment";
import { createPasswordResetEmailContent, createVerificationEmailContent } from "./email/email-content";
import { isAuthEmailDeliveryAvailable, sendAuthEmail } from "./email/email-delivery";

const environment = getBetterAuthEnvironment();
const emailDeliveryAvailable = isAuthEmailDeliveryAvailable();

/**
 * Public sign-up creates only Better Auth User + credential Account rows.
 * It never creates a clinic Patient, Employee, PatientAccount, EmployeeAccount,
 * or employee role. A verified identity must still be linked through the
 * authorized Phase 3D workflow before any patient record can be accessed.
 */
export const auth = betterAuth({
  appName: "MERUNO Medical Clinics",
  baseURL: environment.baseURL,
  secret: environment.secret,
  trustedOrigins: [environment.baseURL],
  database: prismaAdapter(getPrismaClient(), { provider: "postgresql" }),
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      const content = createVerificationEmailContent(url);
      await sendAuthEmail({ to: user.email, ...content });
    },
  },
  emailAndPassword: {
    enabled: true,
    // Fail closed in production until a transactional sender is configured.
    disableSignUp: !emailDeliveryAvailable,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      const content = createPasswordResetEmailContent(url);
      await sendAuthEmail({ to: user.email, ...content });
    },
  },
});
