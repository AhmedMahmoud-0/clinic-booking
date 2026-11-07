import type { ReactNode } from "react";
import Link from "next/link";
import styles from "../../app/login/login.module.css";

interface AuthPageLayoutProps { eyebrow: string; title: string; description: string; children: ReactNode; }

export function AuthPageLayout({ eyebrow, title, description, children }: AuthPageLayoutProps) {
  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.brandPanel} aria-label="MERUNO Medical Clinics">
          <Link className={styles.brand} href="/" aria-label="MERUNO home"><span className={styles.brandMark} aria-hidden="true">M</span><span><strong>MERUNO</strong><small>MEDICAL CLINICS</small></span></Link>
          <div className={styles.brandCopy}><span className={styles.eyebrow}>CARE, CLEARLY.</span><h1>Your health journey, in one place.</h1><p>Secure access to your clinic account and services available to your verified identity.</p></div>
          <div className={styles.trustNote}><span className={styles.trustIcon} aria-hidden="true">✓</span><span>Private account access</span></div>
        </section>
        <section className={styles.formPanel}>
          <Link className={styles.mobileBrand} href="/" aria-label="MERUNO home"><span className={styles.brandMark} aria-hidden="true">M</span><span><strong>MERUNO</strong><small>MEDICAL CLINICS</small></span></Link>
          <div className={styles.formHeading}><span className={styles.eyebrow}>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
          {children}
          <Link className={styles.homeLink} href="/login"><span aria-hidden="true">←</span> Back to sign in</Link>
        </section>
      </div>
    </main>
  );
}
