-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('RECEPTION', 'DOCTOR', 'NURSE', 'LAB_STAFF', 'RADIOLOGY_STAFF', 'RADIOLOGIST', 'CASHIER', 'CLINIC_MANAGER', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "EmployeeRoleAssignmentStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "PatientAccessGrantStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PatientAccessScope" AS ENUM ('VIEW_PROFILE', 'MANAGE_PROFILE', 'BOOK_APPOINTMENTS', 'MANAGE_APPOINTMENTS', 'VIEW_BILLING', 'VIEW_MEDICAL_RECORDS', 'VIEW_DIAGNOSTIC_RESULTS');

-- CreateTable
CREATE TABLE "auth_user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_account" (
    "id" TEXT NOT NULL,
    "accountId" VARCHAR(255) NOT NULL,
    "providerId" VARCHAR(100) NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verification" (
    "id" TEXT NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "linkedByEmployeeId" TEXT,
    "linkedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMPTZ(3),

    CONSTRAINT "EmployeeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "linkedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMPTZ(3),
    "verifiedByEmployeeId" TEXT,

    CONSTRAINT "PatientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRoleAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,
    "status" "EmployeeRoleAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "grantedByEmployeeId" TEXT,
    "revokedByEmployeeId" TEXT,
    "reason" VARCHAR(500),
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmployeeRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAccessGrant" (
    "id" TEXT NOT NULL,
    "subjectPatientId" TEXT NOT NULL,
    "granteePatientId" TEXT NOT NULL,
    "requestedByEmployeeId" TEXT,
    "approvedByPatientId" TEXT,
    "verifiedByEmployeeId" TEXT,
    "status" "PatientAccessGrantStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(500),
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(3),
    "verifiedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PatientAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAccessGrantPermission" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "scope" "PatientAccessScope" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAccessGrantPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_email_key" ON "auth_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_token_key" ON "auth_session"("token");

-- CreateIndex
CREATE INDEX "auth_session_userId_idx" ON "auth_session"("userId");

-- CreateIndex
CREATE INDEX "auth_account_userId_idx" ON "auth_account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_account_providerId_accountId_key" ON "auth_account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAccount_userId_key" ON "EmployeeAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAccount_employeeId_key" ON "EmployeeAccount"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeAccount_linkedByEmployeeId_linkedAt_idx" ON "EmployeeAccount"("linkedByEmployeeId", "linkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_userId_key" ON "PatientAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_patientId_key" ON "PatientAccount"("patientId");

-- CreateIndex
CREATE INDEX "PatientAccount_verifiedByEmployeeId_verifiedAt_idx" ON "PatientAccount"("verifiedByEmployeeId", "verifiedAt");

-- CreateIndex
CREATE INDEX "EmployeeRoleAssignment_employeeId_status_idx" ON "EmployeeRoleAssignment"("employeeId", "status");

-- CreateIndex
CREATE INDEX "EmployeeRoleAssignment_role_status_idx" ON "EmployeeRoleAssignment"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeRoleAssignment_employeeId_role_key" ON "EmployeeRoleAssignment"("employeeId", "role");

-- CreateIndex
CREATE INDEX "PatientAccessGrant_subjectPatientId_status_idx" ON "PatientAccessGrant"("subjectPatientId", "status");

-- CreateIndex
CREATE INDEX "PatientAccessGrant_granteePatientId_status_idx" ON "PatientAccessGrant"("granteePatientId", "status");

-- CreateIndex
CREATE INDEX "PatientAccessGrant_expiresAt_idx" ON "PatientAccessGrant"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccessGrant_subjectPatientId_granteePatientId_key" ON "PatientAccessGrant"("subjectPatientId", "granteePatientId");

-- CreateIndex
CREATE INDEX "PatientAccessGrantPermission_scope_idx" ON "PatientAccessGrantPermission"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccessGrantPermission_grantId_scope_key" ON "PatientAccessGrantPermission"("grantId", "scope");

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAccount" ADD CONSTRAINT "EmployeeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAccount" ADD CONSTRAINT "EmployeeAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAccount" ADD CONSTRAINT "EmployeeAccount_linkedByEmployeeId_fkey" FOREIGN KEY ("linkedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_verifiedByEmployeeId_fkey" FOREIGN KEY ("verifiedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRoleAssignment" ADD CONSTRAINT "EmployeeRoleAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRoleAssignment" ADD CONSTRAINT "EmployeeRoleAssignment_grantedByEmployeeId_fkey" FOREIGN KEY ("grantedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRoleAssignment" ADD CONSTRAINT "EmployeeRoleAssignment_revokedByEmployeeId_fkey" FOREIGN KEY ("revokedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_subjectPatientId_fkey" FOREIGN KEY ("subjectPatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_granteePatientId_fkey" FOREIGN KEY ("granteePatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_subjectPatientId_granteePatientId_fkey" FOREIGN KEY ("subjectPatientId", "granteePatientId") REFERENCES "PatientRelationship"("patientId", "relatedPatientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_approvedByPatientId_fkey" FOREIGN KEY ("approvedByPatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_verifiedByEmployeeId_fkey" FOREIGN KEY ("verifiedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccessGrantPermission" ADD CONSTRAINT "PatientAccessGrantPermission_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "PatientAccessGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
