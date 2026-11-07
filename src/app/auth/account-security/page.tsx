import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSecurityForm } from "../../../components/auth/account-security-form";
import { AccountEmailChangeForm } from "../../../components/auth/account-email-change-form";
import { getAuthSession } from "../../../server/auth/session";
import styles from "../../login/login.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account security | MERUNO Medical Clinics",
  description: "Manage your MERUNO sign-in email and password.",
};

export default async function AccountSecurityPage() {
  const session = await getAuthSession();
  if (!session?.user.emailVerified) redirect("/login");

  return (
    <main className={styles.statusPage}>
      <section className={styles.statusCard}>
        <Link className={styles.mobileBrand} href="/" aria-label="MERUNO home">
          <span className={styles.brandMark} aria-hidden="true">M</span>
          <span><strong>MERUNO</strong><small>MEDICAL CLINICS</small></span>
        </Link>
        <span className={styles.eyebrow}>ACCOUNT SECURITY</span>
        <h1>Manage your account security</h1>
        <p className={styles.statusIntro}>Signed in as <strong>{session.user.email}</strong>. Email changes require approval from your current address and verification of the new address. Linked clinic contact records are synchronized only after both checks succeed.</p>

        <h2>Change sign-in email</h2>
        <AccountEmailChangeForm currentEmail={session.user.email} />

        <h2>Change password</h2>
        <p className={styles.statusIntro}>Provide your current password. Other active sessions are revoked after a successful password change.</p>
        <AccountSecurityForm />

        <div className={styles.statusActions}>
          <Link className={styles.statusHomeLink} href="/auth/account-status">Back to account status</Link>
          <Link className={styles.statusHomeLink} href="/">MERUNO home</Link>
        </div>
      </section>
    </main>
  );
}
