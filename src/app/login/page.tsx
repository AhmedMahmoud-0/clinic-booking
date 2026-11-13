import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "../../components/auth/sign-in-form";
import { AuthPageLayout } from "../../components/auth/auth-page-layout";

export const metadata: Metadata = {
  title: "Sign in | MERUNO Medical Clinics",
  description: "Sign in securely to your MERUNO account.",
};

export default function LoginPage() {
  return (
    <AuthPageLayout
      eyebrow="ACCOUNT ACCESS"
      title="Welcome back"
      description="Sign in with the verified email address linked to your MERUNO account. Your available workspace will open after your account is checked."
    >
      <SignInForm />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href="/forgot-password" className="font-semibold text-[#176B67] hover:text-[#0F504C] hover:underline">Forgot password?</Link>
        <span className="text-[#75847E]">New patient? <Link href="/register" className="font-bold text-[#176B67] hover:text-[#0F504C] hover:underline">Create an account</Link></span>
      </div>
      <div className="mt-5 rounded-2xl border border-[#E2ECE7] bg-[#F6FAF8] px-4 py-3.5 text-xs leading-6 text-[#647772]">
        Creating a sign-in account does not automatically create or link a medical record. The clinic verifies and links existing patient records separately.
      </div>
    </AuthPageLayout>
  );
}
