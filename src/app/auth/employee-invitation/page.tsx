import type { Metadata } from "next";
import Link from "next/link";

import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { EmployeeInvitationAcceptForm } from "../../../components/auth/employee-invitation-accept-form";
import { EmployeeInvitationRegistrationForm } from "../../../components/auth/employee-invitation-registration-form";
import { SignOutButton } from "../../../components/auth/sign-out-button";
import { getAuthSession } from "../../../server/auth/session";
import { getEmployeeInvitationPreview } from "../../../server/auth/invitations/employee-invitation";
import { normalizeInvitationEmail } from "../../../server/auth/invitations/employee-invitation-validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Employee invitation | MERUNO Medical Clinics",
  description: "Review and accept a controlled MERUNO employee account invitation.",
  robots: { index: false, follow: false },
};

interface EmployeeInvitationPageProps {
  searchParams: Promise<{ employeeId?: string; token?: string }>;
}

export default async function EmployeeInvitationPage({ searchParams }: EmployeeInvitationPageProps) {
  const params = await searchParams;
  const employeeId = params.employeeId ?? "";
  const token = params.token ?? "";
  const invitation = await getEmployeeInvitationPreview(employeeId, token);

  if (!invitation) {
    return (
      <AuthPageLayout eyebrow="EMPLOYEE ACCESS" title="Invitation unavailable" description="This invitation link is invalid, expired, already used, or no longer matches an active employee record.">
        <p className="text-sm text-muted-foreground">Ask the clinic System Administrator to review the employee record and issue a new invitation.</p>
        <Link href="/login" className="mt-4 inline-flex font-medium text-primary underline underline-offset-4">Back to sign in</Link>
      </AuthPageLayout>
    );
  }

  const session = await getAuthSession();
  const sessionEmail = session?.user.email ? normalizeInvitationEmail(session.user.email) : null;
  const invitedEmailMatchesSession = Boolean(sessionEmail && sessionEmail === invitation.email);

  return (
    <AuthPageLayout
      eyebrow="EMPLOYEE ACCESS"
      title="Your MERUNO employee invitation"
      description={`This invitation is addressed to ${invitation.email} for the existing employee record of ${invitation.employeeName}.`}
    >
      {session && invitedEmailMatchesSession && session.user.emailVerified ? (
        <EmployeeInvitationAcceptForm employeeId={employeeId} token={token} />
      ) : session ? (
        <div>
          <p className="text-sm text-muted-foreground">
            {invitedEmailMatchesSession
              ? "Verify this email address before accepting the invitation."
              : `You are signed in as ${session.user.email}. Sign out, then sign in using ${invitation.email}.`}
          </p>
          <div className="mt-5"><SignOutButton /></div>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Create a sign-in identity with the invited address, verify it, then return to this invitation email and open the link again. If you already have a verified MERUNO account, sign in and reopen the invitation.
          </p>
          <EmployeeInvitationRegistrationForm email={invitation.email} employeeName={invitation.employeeName} />
          <p className="mt-4 text-sm text-muted-foreground">Already registered? <Link href="/login" className="font-medium text-primary underline underline-offset-4">Sign in</Link>, then reopen the invitation email.</p>
        </div>
      )}
    </AuthPageLayout>
  );
}
