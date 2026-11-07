import type { Metadata } from "next";
import { AuthPageLayout } from "../../../components/auth/auth-page-layout";
import { EmailChangeConfirmationForm } from "../../../components/auth/email-change-confirmation-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Confirm email change | MERUNO Medical Clinics",
  description: "Confirm a change to your MERUNO sign-in email address.",
  robots: { index: false, follow: false },
};

interface EmailChangePageProps {
  searchParams: Promise<{ step?: string; userId?: string; token?: string; result?: string }>;
}

export default async function EmailChangePage({ searchParams }: EmailChangePageProps) {
  const params = await searchParams;
  const result = params.result === "current-approved" || params.result === "completed"
    ? params.result
    : undefined;
  const title = result === "current-approved"
    ? "Current email approved"
    : result === "completed"
      ? "Email change complete"
      : params.step === "current"
        ? "Approve email change"
        : params.step === "new"
          ? "Verify new email address"
          : "Email change confirmation";
  const description = result === "current-approved"
    ? "The final verification link has been sent to your new email address."
    : result === "completed"
      ? "Your new sign-in email is ready to use."
      : "Confirm the requested email-change step to continue.";

  return (
    <AuthPageLayout eyebrow="ACCOUNT SECURITY" title={title} description={description}>
      <EmailChangeConfirmationForm
        step={params.step}
        userId={params.userId}
        token={params.token}
        result={result}
      />
    </AuthPageLayout>
  );
}
