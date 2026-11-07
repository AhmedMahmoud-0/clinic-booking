import type { Metadata } from "next";
import { AuthPageLayout } from "../../components/auth/auth-page-layout";
import { SignUpForm } from "../../components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create patient account | MERUNO Medical Clinics", description: "Create a verified MERUNO patient sign-in account." };

export default function RegisterPage() {
  return <AuthPageLayout eyebrow="PATIENT ACCOUNT" title="Create your account" description="Set up a secure sign-in identity for your MERUNO patient services."><SignUpForm /></AuthPageLayout>;
}
