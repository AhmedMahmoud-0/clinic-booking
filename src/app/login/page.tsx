import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "../../components/auth/sign-in-form";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Sign in | MERUNO Medical Clinics", description: "Sign in to your MERUNO account." };

export default function LoginPage() {
  return (
    <main className={styles.page}><div className={styles.layout}>
      <section className={styles.brandPanel} aria-label="MERUNO Medical Clinics">
        <Link className={styles.brand} href="/" aria-label="MERUNO home"><span className={styles.brandMark} aria-hidden="true">M</span><span><strong>MERUNO</strong><small>MEDICAL CLINICS</small></span></Link>
        <div className={styles.brandCopy}><span className={styles.eyebrow}>CARE, CLEARLY.</span><h1>Your health journey, in one place.</h1><p>Secure access to your clinic account, appointments, and the services available to your verified identity.</p></div>
        <div className={styles.trustNote}><span className={styles.trustIcon} aria-hidden="true">✓</span><span>Private account access</span></div>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.mobileBrand}><span className={styles.brandMark} aria-hidden="true">M</span><span><strong>MERUNO</strong><small>MEDICAL CLINICS</small></span></div>
        <div className={styles.formHeading}><span className={styles.eyebrow}>ACCOUNT ACCESS</span><h2>Welcome back</h2><p>Sign in with the verified email address linked to your MERUNO account.</p></div>
        <SignInForm />
        <div className={styles.registrationNote}><p><Link className={styles.homeLink} href="/forgot-password">Forgot password?</Link></p><p>New patient? <Link className={styles.homeLink} href="/register">Create a patient sign-in account</Link></p><p>Account creation does not automatically link a medical record. The clinic verifies and links patient records separately.</p></div>
        <Link className={styles.homeLink} href="/"><span aria-hidden="true">←</span> Back to MERUNO website</Link>
      </section>
    </div></main>
  );
}
