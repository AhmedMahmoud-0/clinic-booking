import type { Metadata } from "next";
import Link from "next/link";
import { AuthPageLayout } from "../../components/auth/auth-page-layout";
import { SignUpForm } from "../../components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create patient account | MERUNO Medical Clinics",
  description: "Create a verified MERUNO patient sign-in account.",
};

export default function RegisterPage() {
  return (
    <AuthPageLayout
      eyebrow="PATIENT ACCOUNT"
      title="Create your account"
      description="Set up a secure sign-in identity for your MERUNO patient services. Email verification is required before signing in."
    >
      <SignUpForm />
      <p className="mt-6 text-sm text-[#75847E]">Already have an account? <Link href="/login" className="font-bold text-[#176B67] hover:text-[#0F504C] hover:underline">Sign in</Link></p>
    </AuthPageLayout>
  );
}
