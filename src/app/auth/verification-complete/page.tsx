import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../login/login.module.css";

export const metadata: Metadata = { title: "Email verification | MERUNO Medical Clinics", description: "Email verification result for your MERUNO account." };
interface VerificationCompletePageProps { searchParams: Promise<{ error?: string }>; }

export default async function VerificationCompletePage({ searchParams }: VerificationCompletePageProps) {
  const { error } = await searchParams;
  const verified = !error;
  return (
    <main className={styles.statusPage}><section className={styles.statusCard}>
      <Link className={styles.mobileBrand} href="/" aria-label="MERUNO home"><span className={styles.brandMark} aria-hidden="true">M</span><span><strong>MERUNO</strong><small>MEDICAL CLINICS</small></span></Link>
      <span className={styles.eyebrow}>EMAIL VERIFICATION</span>
      <h1>{verified ? "Email verified" : "Verification link not accepted"}</h1>
      <p className={styles.statusIntro}>{verified ? "Your email address is verified. Sign in to continue. Your patient record must still be linked by authorized clinic staff before patient information is available." : "The verification link is invalid or expired. Return to registration and request another verification email."}</p>
      <div className={styles.statusActions}><Link className={styles.statusHomeLink} href={verified ? "/login" : "/register"}>{verified ? "Go to sign in" : "Return to registration"}</Link></div>
    </section></main>
  );
}
