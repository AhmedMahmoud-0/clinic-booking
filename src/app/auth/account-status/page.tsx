import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "../../../components/auth/sign-out-button";
import { getPrismaClient } from "../../../server/db/client";
import { getAuthSession } from "../../../server/auth/session";
import styles from "../../login/login.module.css";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  RECEPTION: "Reception",
  DOCTOR: "Doctor",
  NURSE: "Nurse",
  LAB_STAFF: "Laboratory staff",
  RADIOLOGY_STAFF: "Radiology staff",
  RADIOLOGIST: "Radiologist",
  CASHIER: "Cashier",
  CLINIC_MANAGER: "Clinic manager",
  SYSTEM_ADMIN: "System administrator",
};

export default async function AccountStatusPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const prisma = getPrismaClient();
  const [employeeAccount, patientAccount] = await Promise.all([
    prisma.employeeAccount.findUnique({
      where: { userId: session.user.id },
      select: {
        verifiedAt: true,
        employee: {
          select: {
            firstName: true,
            lastName: true,
            status: true,
            roleAssignments: {
              where: { status: "ACTIVE" },
              select: { role: true },
            },
          },
        },
      },
    }),
    prisma.patientAccount.findUnique({
      where: { userId: session.user.id },
      select: { verifiedAt: true },
    }),
  ]);

  const activeEmployee =
    employeeAccount &&
    employeeAccount.verifiedAt &&
    employeeAccount.employee.status === "ACTIVE" &&
    employeeAccount.employee.roleAssignments.length > 0
      ? employeeAccount.employee
      : null;

  const patientReady = Boolean(patientAccount?.verifiedAt);

  return (
    <main className={styles.statusPage}>
      <section className={styles.statusCard}>
        <Link className={styles.mobileBrand} href="/" aria-label="MERUNO home">
          <span className={styles.brandMark} aria-hidden="true">
            M
          </span>
          <span>
            <strong>MERUNO</strong>
            <small>MEDICAL CLINICS</small>
          </span>
        </Link>

        <span className={styles.eyebrow}>SECURE ACCOUNT SESSION</span>
        <h1>You&apos;re signed in</h1>
        <p className={styles.statusIntro}>
          Signed in as <strong>{session.user.name}</strong> ({session.user.email}).
          Authentication is active; access to clinic records is checked
          separately against your verified clinic identity and permissions.
        </p>

        <div className={styles.identityList}>
          {employeeAccount ? (
            <article className={styles.identityItem}>
              <h2>Employee account</h2>
              {activeEmployee ? (
                <p>
                  {activeEmployee.firstName} {activeEmployee.lastName}
                  <br />
                  Active roles: {activeEmployee.roleAssignments
                    .map(({ role }) => roleLabels[role] ?? role)
                    .join(", ")}
                </p>
              ) : (
                <p>
                  The employee link is not fully verified, the employee is not
                  active, or no active role has been assigned. Staff workspace
                  access is not granted.
                </p>
              )}
            </article>
          ) : null}

          {patientAccount ? (
            <article className={styles.identityItem}>
              <h2>Patient account</h2>
              <p>
                {patientReady
                  ? "A verified patient profile is linked to this account. Patient-record permissions are still checked separately."
                  : "A patient profile link exists but has not completed clinic verification. Patient-record access is not granted."}
              </p>
            </article>
          ) : null}

          {!employeeAccount && !patientAccount ? (
            <article className={styles.identityItem}>
              <h2>Clinic identity not linked</h2>
              <p>
                Your sign-in is valid, but this account is not linked to a
                verified employee or patient profile. No clinic records or
                workspaces are accessible until the clinic completes the
                appropriate identity-verification process.
              </p>
            </article>
          ) : null}
        </div>

        <div className={styles.statusActions}>
          <SignOutButton />
          <Link className={styles.statusHomeLink} href="/">
            Return to website
          </Link>
        </div>
      </section>
    </main>
  );
}
