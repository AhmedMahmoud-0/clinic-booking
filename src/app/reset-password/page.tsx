import type { Metadata } from "next";
import { AuthPageLayout } from "../../components/auth/auth-page-layout";
import { ResetPasswordForm } from "../../components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password | MERUNO Medical Clinics", description: "Set a new password for your MERUNO sign-in account." };
interface ResetPasswordPageProps { searchParams: Promise<{ token?: string; error?: string }>; }

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  return <AuthPageLayout eyebrow="ACCOUNT RECOVERY" title="Choose a new password" description="Use a new password with at least 12 characters."><ResetPasswordForm token={params.token ?? null} tokenError={params.error ?? null} /></AuthPageLayout>;
}
