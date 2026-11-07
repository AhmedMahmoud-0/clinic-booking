import type { Metadata } from "next";
import { AuthPageLayout } from "../../components/auth/auth-page-layout";
import { ForgotPasswordForm } from "../../components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password | MERUNO Medical Clinics", description: "Request a secure password reset link for your MERUNO account." };

export default function ForgotPasswordPage() {
  return <AuthPageLayout eyebrow="ACCOUNT RECOVERY" title="Reset your password" description="Enter the email address for your MERUNO sign-in account."><ForgotPasswordForm /></AuthPageLayout>;
}
