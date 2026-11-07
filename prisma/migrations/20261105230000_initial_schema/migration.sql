-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ScheduleExceptionType" AS ENUM ('BLOCKED', 'EXTRA_HOURS');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CONSULTATION', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "PatientContactType" AS ENUM ('PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "PatientGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED');

-- CreateEnum
CREATE TYPE "PatientRelationshipType" AS ENUM ('PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('PUBLIC_WEBSITE', 'PATIENT_PORTAL', 'RECEPTION');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentChangeSource" AS ENUM ('STAFF', 'PATIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "QueueEntryType" AS ENUM ('APPOINTMENT', 'WALK_IN');

-- CreateEnum
CREATE TYPE "QueueEntryStatus" AS ENUM ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'LEFT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IdentityElementType" AS ENUM ('FULL_NAME', 'DATE_OF_BIRTH', 'PHONE', 'NATIONAL_ID', 'PASSPORT', 'MRN', 'OTHER');

-- CreateEnum
CREATE TYPE "IdentityVerificationResult" AS ENUM ('VERIFIED', 'FAILED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClinicalNoteType" AS ENUM ('INITIAL_ASSESSMENT', 'FOLLOW_UP', 'PROGRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "ClinicalNoteStatus" AS ENUM ('DRAFT', 'SIGNED');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DiagnosticOrderPriority" AS ENUM ('ROUTINE', 'URGENT');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('ORDERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabOrderItemStatus" AS ENUM ('PENDING', 'COLLECTED', 'RECEIVED', 'REJECTED', 'PROCESSING', 'RESULTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabSampleStatus" AS ENUM ('COLLECTED', 'RECEIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LabResultStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabResultValueType" AS ENUM ('NUMERIC', 'TEXT', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "LabAbnormalFlag" AS ENUM ('NOT_INDICATED', 'NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH', 'ABNORMAL');

-- CreateEnum
CREATE TYPE "DiagnosticReviewDecision" AS ENUM ('REVIEWED', 'FOLLOW_UP_REQUIRED');

-- CreateEnum
CREATE TYPE "LabResultApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CriticalCommunicationMethod" AS ENUM ('PHONE', 'IN_PERSON', 'SECURE_MESSAGE');

-- CreateEnum
CREATE TYPE "CriticalCommunicationStatus" AS ENUM ('PENDING', 'NOTIFIED', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RadiologyModality" AS ENUM ('DIGITAL_XRAY', 'ULTRASOUND');

-- CreateEnum
CREATE TYPE "RadiologyOrderStatus" AS ENUM ('ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RadiologyOrderItemStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RadiologyExamStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PregnancyScreeningResult" AS ENUM ('NOT_APPLICABLE', 'NEGATIVE', 'POSITIVE', 'DECLINED');

-- CreateEnum
CREATE TYPE "RadiologyReportStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RadiologyReportApprovalDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "InvoiceItemSourceType" AS ENUM ('SERVICE', 'LAB_TEST', 'RADIOLOGY_PROCEDURE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'POS_CARD', 'CLINIC_E_WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "DiscountApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComplaintChannel" AS ENUM ('WEBSITE', 'PATIENT_PORTAL', 'PHONE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('APPOINTMENT', 'STAFF_CONDUCT', 'WAIT_TIME', 'BILLING', 'FACILITY', 'SERVICE_QUALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('RECEIVED', 'ACKNOWLEDGED', 'IN_REVIEW', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ComplaintEventType" AS ENUM ('RECEIVED', 'ACKNOWLEDGED', 'ASSIGNED', 'STATUS_CHANGED', 'NOTE_ADDED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('CLINICAL', 'PATIENT_SAFETY', 'FACILITY', 'PRIVACY', 'SECURITY', 'OPERATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AttachmentPurpose" AS ENUM ('PATIENT_DOCUMENT', 'CLINICAL_DOCUMENT', 'LAB_DOCUMENT', 'RADIOLOGY_DOCUMENT', 'COMPLAINT_EVIDENCE', 'INCIDENT_EVIDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BROWSER_PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('EMPLOYEE', 'SYSTEM', 'EXTERNAL');

-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" VARCHAR(30) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "workEmail" VARCHAR(254),
    "phone" VARCHAR(30),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hiredOn" DATE,
    "endedOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "professionalTitle" VARCHAR(120),
    "publicDisplayName" VARCHAR(160),
    "publicBio" TEXT,
    "yearsOfExperience" INTEGER,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "isPubliclyVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorSpecialty" (
    "doctorId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DoctorSpecialty_pkey" PRIMARY KEY ("doctorId","specialtyId")
);

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(140) NOT NULL,
    "type" "ServiceType" NOT NULL DEFAULT 'CONSULTATION',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorService" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DoctorService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorWeeklySchedule" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "startMinuteOfDay" INTEGER NOT NULL,
    "endMinuteOfDay" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DoctorWeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorScheduleException" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "type" "ScheduleExceptionType" NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(500),
    "createdByEmployeeId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "mrn" VARCHAR(30) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "preferredName" VARCHAR(100),
    "dateOfBirth" DATE,
    "gender" "PatientGender",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientContact" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "PatientContactType" NOT NULL,
    "value" VARCHAR(254) NOT NULL,
    "normalizedValue" VARCHAR(254) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PatientContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRelationship" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "relatedPatientId" TEXT NOT NULL,
    "relationshipType" "PatientRelationshipType" NOT NULL,
    "isLegalGuardian" BOOLEAN NOT NULL DEFAULT false,
    "guardianVerifiedAt" TIMESTAMPTZ(3),
    "guardianVerifiedByEmployeeId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "bookingReference" VARCHAR(24) NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorServiceId" TEXT NOT NULL,
    "source" "AppointmentSource" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "bookedPrice" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "reasonForVisit" VARCHAR(1000),
    "createdByEmployeeId" TEXT,
    "confirmedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" VARCHAR(500),
    "checkedInAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentStatusHistory" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "changeSource" "AppointmentChangeSource" NOT NULL,
    "changedByEmployeeId" TEXT,
    "changedByPatientId" TEXT,
    "reason" VARCHAR(500),
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueEntry" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "queueDate" DATE NOT NULL,
    "queueNumber" INTEGER NOT NULL,
    "type" "QueueEntryType" NOT NULL,
    "status" "QueueEntryStatus" NOT NULL DEFAULT 'WAITING',
    "checkedInAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMPTZ(3),
    "serviceStartedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdByEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "QueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "firstElement" "IdentityElementType" NOT NULL,
    "secondElement" "IdentityElementType" NOT NULL,
    "result" "IdentityVerificationResult" NOT NULL,
    "performedByEmployeeId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" VARCHAR(500),

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "queueEntryId" TEXT,
    "status" "EncounterStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "chiefComplaint" TEXT,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "createdByEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "type" "ClinicalNoteType" NOT NULL DEFAULT 'INITIAL_ASSESSMENT',
    "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "authorEmployeeId" TEXT NOT NULL,
    "signedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalSign" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "recordedByEmployeeId" TEXT NOT NULL,
    "measuredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperatureC" DECIMAL(4,1),
    "systolicMmHg" INTEGER,
    "diastolicMmHg" INTEGER,
    "pulseBpm" INTEGER,
    "respiratoryRatePerMin" INTEGER,
    "oxygenSaturationPct" DECIMAL(5,2),
    "heightCm" DECIMAL(6,2),
    "weightKg" DECIMAL(6,2),
    "bmi" DECIMAL(5,2),
    "note" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisCatalog" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40),
    "codeSystem" VARCHAR(40),
    "displayName" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DiagnosisCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncounterDiagnosis" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "displayNameSnapshot" VARCHAR(180) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" VARCHAR(1000),
    "recordedByEmployeeId" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "generalInstructions" TEXT,
    "prescribedByEmployeeId" TEXT NOT NULL,
    "issuedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicationName" VARCHAR(180) NOT NULL,
    "strength" VARCHAR(100),
    "dosage" VARCHAR(180) NOT NULL,
    "route" VARCHAR(80),
    "frequency" VARCHAR(180) NOT NULL,
    "durationDays" INTEGER,
    "quantity" DECIMAL(10,2),
    "quantityUnit" VARCHAR(40),
    "refills" INTEGER NOT NULL DEFAULT 0,
    "instructions" VARCHAR(1000),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalAmendment" (
    "id" TEXT NOT NULL,
    "clinicalNoteId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "correctedContent" TEXT NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "createdByEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "type" "ReferralType" NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referredToSpecialtyId" TEXT,
    "referredToDoctorId" TEXT,
    "externalFacilityName" VARCHAR(180),
    "externalContact" VARCHAR(180),
    "reason" VARCHAR(1000) NOT NULL,
    "instructions" TEXT,
    "createdByEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "specimenType" VARCHAR(100),
    "defaultTurnaroundMinutes" INTEGER,
    "requiresFasting" BOOLEAN NOT NULL DEFAULT false,
    "preparationInstructions" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestComponent" (
    "id" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "valueType" "LabResultValueType" NOT NULL DEFAULT 'TEXT',
    "defaultUnit" VARCHAR(40),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LabTestComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "orderReference" VARCHAR(30) NOT NULL,
    "encounterId" TEXT NOT NULL,
    "orderedByEmployeeId" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "priority" "DiagnosticOrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "clinicalNotes" VARCHAR(1000),
    "orderedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrderItem" (
    "id" TEXT NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "status" "LabOrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "priceSnapshot" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "collectionNotes" VARCHAR(500),
    "collectedAt" TIMESTAMPTZ(3),
    "receivedAt" TIMESTAMPTZ(3),
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LabOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSample" (
    "id" TEXT NOT NULL,
    "sampleNumber" VARCHAR(30) NOT NULL,
    "status" "LabSampleStatus" NOT NULL DEFAULT 'COLLECTED',
    "collectedByEmployeeId" TEXT NOT NULL,
    "receivedByEmployeeId" TEXT,
    "collectedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMPTZ(3),
    "rejectionReason" VARCHAR(500),
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LabSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSampleItem" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabSampleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "status" "LabResultStatus" NOT NULL DEFAULT 'DRAFT',
    "resultSummary" TEXT,
    "authoredByEmployeeId" TEXT NOT NULL,
    "approvedByEmployeeId" TEXT,
    "resultedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(3),
    "releasedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResultValue" (
    "id" TEXT NOT NULL,
    "labResultId" TEXT NOT NULL,
    "componentCodeSnapshot" VARCHAR(40) NOT NULL,
    "componentNameSnapshot" VARCHAR(160) NOT NULL,
    "valueType" "LabResultValueType" NOT NULL,
    "valueText" VARCHAR(1000),
    "valueNumeric" DECIMAL(16,5),
    "valueBoolean" BOOLEAN,
    "unitSnapshot" VARCHAR(40),
    "referenceRangeSnapshot" VARCHAR(160),
    "abnormalFlag" "LabAbnormalFlag" NOT NULL DEFAULT 'NOT_INDICATED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResultValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResultReview" (
    "id" TEXT NOT NULL,
    "labResultId" TEXT NOT NULL,
    "reviewerEmployeeId" TEXT NOT NULL,
    "decision" "LabResultApprovalDecision" NOT NULL,
    "comments" VARCHAR(1000),
    "reviewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabResultReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabClinicalReview" (
    "id" TEXT NOT NULL,
    "labResultId" TEXT NOT NULL,
    "reviewerEmployeeId" TEXT NOT NULL,
    "decision" "DiagnosticReviewDecision" NOT NULL,
    "notes" VARCHAR(1000),
    "reviewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabClinicalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabCriticalCommunication" (
    "id" TEXT NOT NULL,
    "labResultId" TEXT NOT NULL,
    "status" "CriticalCommunicationStatus" NOT NULL DEFAULT 'PENDING',
    "method" "CriticalCommunicationMethod" NOT NULL,
    "communicatedToName" VARCHAR(160) NOT NULL,
    "readBackRequired" BOOLEAN NOT NULL DEFAULT true,
    "readBackConfirmedAt" TIMESTAMPTZ(3),
    "notifiedByEmployeeId" TEXT NOT NULL,
    "acknowledgedByEmployeeId" TEXT,
    "notifiedAt" TIMESTAMPTZ(3),
    "acknowledgedAt" TIMESTAMPTZ(3),
    "escalatedAt" TIMESTAMPTZ(3),
    "resolutionNotes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabCriticalCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyProcedure" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "modality" "RadiologyModality" NOT NULL,
    "description" TEXT,
    "defaultDurationMinutes" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "preparationInstructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RadiologyProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyResource" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "modality" "RadiologyModality" NOT NULL,
    "location" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RadiologyResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyOrder" (
    "id" TEXT NOT NULL,
    "orderReference" VARCHAR(30) NOT NULL,
    "encounterId" TEXT NOT NULL,
    "orderedByEmployeeId" TEXT NOT NULL,
    "status" "RadiologyOrderStatus" NOT NULL DEFAULT 'ORDERED',
    "priority" "DiagnosticOrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "clinicalNotes" VARCHAR(1000),
    "orderedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancellationReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RadiologyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyOrderItem" (
    "id" TEXT NOT NULL,
    "radiologyOrderId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "status" "RadiologyOrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "priceSnapshot" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "instructions" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RadiologyOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyExam" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "resourceId" TEXT,
    "status" "RadiologyExamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStartsAt" TIMESTAMPTZ(3),
    "scheduledEndsAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "performedAt" TIMESTAMPTZ(3),
    "performedByEmployeeId" TEXT,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RadiologyExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyPregnancyScreening" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "result" "PregnancyScreeningResult" NOT NULL,
    "screeningNotes" VARCHAR(1000),
    "recordedByEmployeeId" TEXT NOT NULL,
    "screenedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadiologyPregnancyScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyReport" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "status" "RadiologyReportStatus" NOT NULL DEFAULT 'DRAFT',
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "recommendations" TEXT,
    "authoredByEmployeeId" TEXT NOT NULL,
    "approvedByEmployeeId" TEXT,
    "authoredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(3),
    "releasedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RadiologyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyReportReview" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reviewerEmployeeId" TEXT NOT NULL,
    "decision" "RadiologyReportApprovalDecision" NOT NULL,
    "comments" VARCHAR(1000),
    "reviewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadiologyReportReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyClinicalReview" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reviewerEmployeeId" TEXT NOT NULL,
    "decision" "DiagnosticReviewDecision" NOT NULL,
    "notes" VARCHAR(1000),
    "reviewedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadiologyClinicalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadiologyCriticalCommunication" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "CriticalCommunicationStatus" NOT NULL DEFAULT 'PENDING',
    "method" "CriticalCommunicationMethod" NOT NULL,
    "communicatedToName" VARCHAR(160) NOT NULL,
    "readBackRequired" BOOLEAN NOT NULL DEFAULT true,
    "readBackConfirmedAt" TIMESTAMPTZ(3),
    "notifiedByEmployeeId" TEXT NOT NULL,
    "acknowledgedByEmployeeId" TEXT,
    "notifiedAt" TIMESTAMPTZ(3),
    "acknowledgedAt" TIMESTAMPTZ(3),
    "escalatedAt" TIMESTAMPTZ(3),
    "resolutionNotes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadiologyCriticalCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" VARCHAR(30) NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "issuedAt" TIMESTAMPTZ(3),
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" VARCHAR(500),
    "createdByEmployeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sourceType" "InvoiceItemSourceType" NOT NULL,
    "description" VARCHAR(240) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "serviceCatalogId" TEXT,
    "labOrderItemId" TEXT,
    "radiologyOrderItemId" TEXT,
    "serviceCompletedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "transactionReference" VARCHAR(120),
    "receivedByEmployeeId" TEXT NOT NULL,
    "paidAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountApproval" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "DiscountApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByEmployeeId" TEXT NOT NULL,
    "decidedByEmployeeId" TEXT,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "DiscountApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "refundReference" VARCHAR(30) NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL DEFAULT 'EGP',
    "reason" VARCHAR(500) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByEmployeeId" TEXT NOT NULL,
    "approvedByEmployeeId" TEXT,
    "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundItem" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "invoiceItemId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "referenceNumber" VARCHAR(30) NOT NULL,
    "patientId" TEXT,
    "appointmentId" TEXT,
    "invoiceId" TEXT,
    "channel" "ComplaintChannel" NOT NULL,
    "category" "ComplaintCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'RECEIVED',
    "subject" VARCHAR(180) NOT NULL,
    "description" TEXT NOT NULL,
    "submitterName" VARCHAR(160),
    "submitterPhone" VARCHAR(30),
    "submitterEmail" VARCHAR(254),
    "createdByEmployeeId" TEXT,
    "assignedToEmployeeId" TEXT,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMPTZ(3),
    "resolvedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintEvent" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "eventType" "ComplaintEventType" NOT NULL,
    "fromStatus" "ComplaintStatus",
    "toStatus" "ComplaintStatus",
    "note" VARCHAR(1000),
    "actorEmployeeId" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "referenceNumber" VARCHAR(30) NOT NULL,
    "category" "IncidentCategory" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "patientId" TEXT,
    "encounterId" TEXT,
    "reportedByEmployeeId" TEXT NOT NULL,
    "assignedToEmployeeId" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "reportedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" VARCHAR(180) NOT NULL,
    "description" TEXT NOT NULL,
    "immediateActions" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "encounterId" TEXT,
    "labResultId" TEXT,
    "radiologyReportId" TEXT,
    "complaintId" TEXT,
    "incidentReportId" TEXT,
    "purpose" "AttachmentPurpose" NOT NULL,
    "originalFileName" VARCHAR(255) NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" CHAR(64),
    "uploadedByEmployeeId" TEXT,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "employeeId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "actionPath" VARCHAR(300),
    "scheduledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "readAt" TIMESTAMPTZ(3),
    "failureCode" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorEmployeeId" TEXT,
    "action" VARCHAR(60) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(80) NOT NULL,
    "reason" VARCHAR(500),
    "requestId" VARCHAR(100),
    "ipAddress" VARCHAR(45),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_code_key" ON "Specialty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_name_key" ON "Specialty"("name");

-- CreateIndex
CREATE INDEX "Specialty_isActive_sortOrder_idx" ON "Specialty"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_workEmail_key" ON "Employee"("workEmail");

-- CreateIndex
CREATE INDEX "Employee_status_lastName_firstName_idx" ON "Employee"("status", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_employeeId_key" ON "DoctorProfile"("employeeId");

-- CreateIndex
CREATE INDEX "DoctorProfile_isBookable_isPubliclyVisible_idx" ON "DoctorProfile"("isBookable", "isPubliclyVisible");

-- CreateIndex
CREATE INDEX "DoctorSpecialty_specialtyId_isPrimary_idx" ON "DoctorSpecialty"("specialtyId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_code_key" ON "ServiceCatalog"("code");

-- CreateIndex
CREATE INDEX "ServiceCatalog_type_isActive_idx" ON "ServiceCatalog"("type", "isActive");

-- CreateIndex
CREATE INDEX "ServiceCatalog_name_idx" ON "ServiceCatalog"("name");

-- CreateIndex
CREATE INDEX "DoctorService_serviceId_isActive_idx" ON "DoctorService"("serviceId", "isActive");

-- CreateIndex
CREATE INDEX "DoctorService_doctorId_isActive_idx" ON "DoctorService"("doctorId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorService_doctorId_serviceId_key" ON "DoctorService"("doctorId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorService_id_doctorId_key" ON "DoctorService"("id", "doctorId");

-- CreateIndex
CREATE INDEX "DoctorWeeklySchedule_doctorId_weekday_isActive_idx" ON "DoctorWeeklySchedule"("doctorId", "weekday", "isActive");

-- CreateIndex
CREATE INDEX "DoctorWeeklySchedule_doctorId_effectiveFrom_effectiveUntil_idx" ON "DoctorWeeklySchedule"("doctorId", "effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE INDEX "DoctorScheduleException_doctorId_startsAt_endsAt_idx" ON "DoctorScheduleException"("doctorId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "DoctorScheduleException_createdByEmployeeId_idx" ON "DoctorScheduleException"("createdByEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Patient_isActive_createdAt_idx" ON "Patient"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "PatientContact_type_normalizedValue_idx" ON "PatientContact"("type", "normalizedValue");

-- CreateIndex
CREATE INDEX "PatientContact_patientId_type_isPrimary_idx" ON "PatientContact"("patientId", "type", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "PatientContact_patientId_type_normalizedValue_key" ON "PatientContact"("patientId", "type", "normalizedValue");

-- CreateIndex
CREATE INDEX "PatientRelationship_relatedPatientId_isLegalGuardian_idx" ON "PatientRelationship"("relatedPatientId", "isLegalGuardian");

-- CreateIndex
CREATE INDEX "PatientRelationship_guardianVerifiedByEmployeeId_idx" ON "PatientRelationship"("guardianVerifiedByEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientRelationship_patientId_relatedPatientId_key" ON "PatientRelationship"("patientId", "relatedPatientId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_bookingReference_key" ON "Appointment"("bookingReference");

-- CreateIndex
CREATE INDEX "Appointment_patientId_startsAt_idx" ON "Appointment"("patientId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_startsAt_endsAt_idx" ON "Appointment"("doctorId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Appointment_status_startsAt_idx" ON "Appointment"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_createdByEmployeeId_idx" ON "Appointment"("createdByEmployeeId");

-- CreateIndex
CREATE INDEX "AppointmentStatusHistory_appointmentId_changedAt_idx" ON "AppointmentStatusHistory"("appointmentId", "changedAt");

-- CreateIndex
CREATE INDEX "AppointmentStatusHistory_changedByEmployeeId_changedAt_idx" ON "AppointmentStatusHistory"("changedByEmployeeId", "changedAt");

-- CreateIndex
CREATE INDEX "AppointmentStatusHistory_changedByPatientId_changedAt_idx" ON "AppointmentStatusHistory"("changedByPatientId", "changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_appointmentId_key" ON "QueueEntry"("appointmentId");

-- CreateIndex
CREATE INDEX "QueueEntry_doctorId_queueDate_status_queueNumber_idx" ON "QueueEntry"("doctorId", "queueDate", "status", "queueNumber");

-- CreateIndex
CREATE INDEX "QueueEntry_patientId_queueDate_idx" ON "QueueEntry"("patientId", "queueDate");

-- CreateIndex
CREATE INDEX "QueueEntry_createdByEmployeeId_createdAt_idx" ON "QueueEntry"("createdByEmployeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QueueEntry_doctorId_queueDate_queueNumber_key" ON "QueueEntry"("doctorId", "queueDate", "queueNumber");

-- CreateIndex
CREATE INDEX "IdentityVerification_patientId_verifiedAt_idx" ON "IdentityVerification"("patientId", "verifiedAt");

-- CreateIndex
CREATE INDEX "IdentityVerification_appointmentId_verifiedAt_idx" ON "IdentityVerification"("appointmentId", "verifiedAt");

-- CreateIndex
CREATE INDEX "IdentityVerification_encounterId_verifiedAt_idx" ON "IdentityVerification"("encounterId", "verifiedAt");

-- CreateIndex
CREATE INDEX "IdentityVerification_performedByEmployeeId_verifiedAt_idx" ON "IdentityVerification"("performedByEmployeeId", "verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_appointmentId_key" ON "Encounter"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Encounter_queueEntryId_key" ON "Encounter"("queueEntryId");

-- CreateIndex
CREATE INDEX "Encounter_patientId_startedAt_idx" ON "Encounter"("patientId", "startedAt");

-- CreateIndex
CREATE INDEX "Encounter_doctorId_startedAt_idx" ON "Encounter"("doctorId", "startedAt");

-- CreateIndex
CREATE INDEX "Encounter_status_startedAt_idx" ON "Encounter"("status", "startedAt");

-- CreateIndex
CREATE INDEX "Encounter_createdByEmployeeId_createdAt_idx" ON "Encounter"("createdByEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalNote_encounterId_status_createdAt_idx" ON "ClinicalNote"("encounterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalNote_authorEmployeeId_createdAt_idx" ON "ClinicalNote"("authorEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "VitalSign_encounterId_measuredAt_idx" ON "VitalSign"("encounterId", "measuredAt");

-- CreateIndex
CREATE INDEX "VitalSign_recordedByEmployeeId_measuredAt_idx" ON "VitalSign"("recordedByEmployeeId", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCatalog_code_key" ON "DiagnosisCatalog"("code");

-- CreateIndex
CREATE INDEX "DiagnosisCatalog_displayName_idx" ON "DiagnosisCatalog"("displayName");

-- CreateIndex
CREATE INDEX "DiagnosisCatalog_isActive_displayName_idx" ON "DiagnosisCatalog"("isActive", "displayName");

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_encounterId_isPrimary_idx" ON "EncounterDiagnosis"("encounterId", "isPrimary");

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_diagnosisId_recordedAt_idx" ON "EncounterDiagnosis"("diagnosisId", "recordedAt");

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_recordedByEmployeeId_recordedAt_idx" ON "EncounterDiagnosis"("recordedByEmployeeId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EncounterDiagnosis_encounterId_diagnosisId_key" ON "EncounterDiagnosis"("encounterId", "diagnosisId");

-- CreateIndex
CREATE INDEX "Prescription_encounterId_status_createdAt_idx" ON "Prescription"("encounterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Prescription_prescribedByEmployeeId_createdAt_idx" ON "Prescription"("prescribedByEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_sortOrder_idx" ON "PrescriptionItem"("prescriptionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ClinicalAmendment_clinicalNoteId_createdAt_idx" ON "ClinicalAmendment"("clinicalNoteId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicalAmendment_createdByEmployeeId_createdAt_idx" ON "ClinicalAmendment"("createdByEmployeeId", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_encounterId_createdAt_idx" ON "Referral"("encounterId", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Referral_referredToSpecialtyId_idx" ON "Referral"("referredToSpecialtyId");

-- CreateIndex
CREATE INDEX "Referral_referredToDoctorId_idx" ON "Referral"("referredToDoctorId");

-- CreateIndex
CREATE INDEX "Referral_createdByEmployeeId_createdAt_idx" ON "Referral"("createdByEmployeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabTest_code_key" ON "LabTest"("code");

-- CreateIndex
CREATE INDEX "LabTest_isActive_name_idx" ON "LabTest"("isActive", "name");

-- CreateIndex
CREATE INDEX "LabTestComponent_labTestId_isActive_sortOrder_idx" ON "LabTestComponent"("labTestId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LabTestComponent_labTestId_code_key" ON "LabTestComponent"("labTestId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LabOrder_orderReference_key" ON "LabOrder"("orderReference");

-- CreateIndex
CREATE INDEX "LabOrder_encounterId_orderedAt_idx" ON "LabOrder"("encounterId", "orderedAt");

-- CreateIndex
CREATE INDEX "LabOrder_status_priority_orderedAt_idx" ON "LabOrder"("status", "priority", "orderedAt");

-- CreateIndex
CREATE INDEX "LabOrder_orderedByEmployeeId_orderedAt_idx" ON "LabOrder"("orderedByEmployeeId", "orderedAt");

-- CreateIndex
CREATE INDEX "LabOrderItem_status_createdAt_idx" ON "LabOrderItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LabOrderItem_labTestId_createdAt_idx" ON "LabOrderItem"("labTestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabOrderItem_labOrderId_labTestId_key" ON "LabOrderItem"("labOrderId", "labTestId");

-- CreateIndex
CREATE UNIQUE INDEX "LabSample_sampleNumber_key" ON "LabSample"("sampleNumber");

-- CreateIndex
CREATE INDEX "LabSample_status_collectedAt_idx" ON "LabSample"("status", "collectedAt");

-- CreateIndex
CREATE INDEX "LabSample_receivedByEmployeeId_receivedAt_idx" ON "LabSample"("receivedByEmployeeId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabSampleItem_orderItemId_key" ON "LabSampleItem"("orderItemId");

-- CreateIndex
CREATE INDEX "LabSampleItem_sampleId_idx" ON "LabSampleItem"("sampleId");

-- CreateIndex
CREATE UNIQUE INDEX "LabSampleItem_sampleId_orderItemId_key" ON "LabSampleItem"("sampleId", "orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LabResult_orderItemId_key" ON "LabResult"("orderItemId");

-- CreateIndex
CREATE INDEX "LabResult_status_resultedAt_idx" ON "LabResult"("status", "resultedAt");

-- CreateIndex
CREATE INDEX "LabResult_approvedByEmployeeId_approvedAt_idx" ON "LabResult"("approvedByEmployeeId", "approvedAt");

-- CreateIndex
CREATE INDEX "LabResultValue_labResultId_sortOrder_idx" ON "LabResultValue"("labResultId", "sortOrder");

-- CreateIndex
CREATE INDEX "LabResultValue_abnormalFlag_idx" ON "LabResultValue"("abnormalFlag");

-- CreateIndex
CREATE INDEX "LabResultReview_labResultId_reviewedAt_idx" ON "LabResultReview"("labResultId", "reviewedAt");

-- CreateIndex
CREATE INDEX "LabResultReview_reviewerEmployeeId_reviewedAt_idx" ON "LabResultReview"("reviewerEmployeeId", "reviewedAt");

-- CreateIndex
CREATE INDEX "LabClinicalReview_reviewerEmployeeId_reviewedAt_idx" ON "LabClinicalReview"("reviewerEmployeeId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabClinicalReview_labResultId_reviewerEmployeeId_key" ON "LabClinicalReview"("labResultId", "reviewerEmployeeId");

-- CreateIndex
CREATE INDEX "LabCriticalCommunication_status_createdAt_idx" ON "LabCriticalCommunication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LabCriticalCommunication_labResultId_createdAt_idx" ON "LabCriticalCommunication"("labResultId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyProcedure_code_key" ON "RadiologyProcedure"("code");

-- CreateIndex
CREATE INDEX "RadiologyProcedure_modality_isActive_name_idx" ON "RadiologyProcedure"("modality", "isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyResource_code_key" ON "RadiologyResource"("code");

-- CreateIndex
CREATE INDEX "RadiologyResource_modality_isActive_idx" ON "RadiologyResource"("modality", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyOrder_orderReference_key" ON "RadiologyOrder"("orderReference");

-- CreateIndex
CREATE INDEX "RadiologyOrder_encounterId_orderedAt_idx" ON "RadiologyOrder"("encounterId", "orderedAt");

-- CreateIndex
CREATE INDEX "RadiologyOrder_status_priority_orderedAt_idx" ON "RadiologyOrder"("status", "priority", "orderedAt");

-- CreateIndex
CREATE INDEX "RadiologyOrder_orderedByEmployeeId_orderedAt_idx" ON "RadiologyOrder"("orderedByEmployeeId", "orderedAt");

-- CreateIndex
CREATE INDEX "RadiologyOrderItem_radiologyOrderId_status_idx" ON "RadiologyOrderItem"("radiologyOrderId", "status");

-- CreateIndex
CREATE INDEX "RadiologyOrderItem_procedureId_createdAt_idx" ON "RadiologyOrderItem"("procedureId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyExam_orderItemId_key" ON "RadiologyExam"("orderItemId");

-- CreateIndex
CREATE INDEX "RadiologyExam_status_scheduledStartsAt_idx" ON "RadiologyExam"("status", "scheduledStartsAt");

-- CreateIndex
CREATE INDEX "RadiologyExam_resourceId_scheduledStartsAt_scheduledEndsAt_idx" ON "RadiologyExam"("resourceId", "scheduledStartsAt", "scheduledEndsAt");

-- CreateIndex
CREATE INDEX "RadiologyExam_performedByEmployeeId_performedAt_idx" ON "RadiologyExam"("performedByEmployeeId", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyPregnancyScreening_examId_key" ON "RadiologyPregnancyScreening"("examId");

-- CreateIndex
CREATE INDEX "RadiologyPregnancyScreening_result_screenedAt_idx" ON "RadiologyPregnancyScreening"("result", "screenedAt");

-- CreateIndex
CREATE INDEX "RadiologyPregnancyScreening_recordedByEmployeeId_screenedAt_idx" ON "RadiologyPregnancyScreening"("recordedByEmployeeId", "screenedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyReport_examId_key" ON "RadiologyReport"("examId");

-- CreateIndex
CREATE INDEX "RadiologyReport_status_authoredAt_idx" ON "RadiologyReport"("status", "authoredAt");

-- CreateIndex
CREATE INDEX "RadiologyReport_approvedByEmployeeId_approvedAt_idx" ON "RadiologyReport"("approvedByEmployeeId", "approvedAt");

-- CreateIndex
CREATE INDEX "RadiologyReportReview_reportId_reviewedAt_idx" ON "RadiologyReportReview"("reportId", "reviewedAt");

-- CreateIndex
CREATE INDEX "RadiologyReportReview_reviewerEmployeeId_reviewedAt_idx" ON "RadiologyReportReview"("reviewerEmployeeId", "reviewedAt");

-- CreateIndex
CREATE INDEX "RadiologyClinicalReview_reviewerEmployeeId_reviewedAt_idx" ON "RadiologyClinicalReview"("reviewerEmployeeId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadiologyClinicalReview_reportId_reviewerEmployeeId_key" ON "RadiologyClinicalReview"("reportId", "reviewerEmployeeId");

-- CreateIndex
CREATE INDEX "RadiologyCriticalCommunication_status_createdAt_idx" ON "RadiologyCriticalCommunication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RadiologyCriticalCommunication_reportId_createdAt_idx" ON "RadiologyCriticalCommunication"("reportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_encounterId_key" ON "Invoice"("encounterId");

-- CreateIndex
CREATE INDEX "Invoice_patientId_createdAt_idx" ON "Invoice"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_status_issuedAt_idx" ON "Invoice"("status", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_createdByEmployeeId_createdAt_idx" ON "Invoice"("createdByEmployeeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_labOrderItemId_key" ON "InvoiceItem"("labOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_radiologyOrderItemId_key" ON "InvoiceItem"("radiologyOrderItemId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_createdAt_idx" ON "InvoiceItem"("invoiceId", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceItem_serviceCatalogId_idx" ON "InvoiceItem"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_status_idx" ON "Payment"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "Payment_receivedByEmployeeId_paidAt_idx" ON "Payment"("receivedByEmployeeId", "paidAt");

-- CreateIndex
CREATE INDEX "DiscountApproval_invoiceId_requestedAt_idx" ON "DiscountApproval"("invoiceId", "requestedAt");

-- CreateIndex
CREATE INDEX "DiscountApproval_status_requestedAt_idx" ON "DiscountApproval"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "DiscountApproval_requestedByEmployeeId_requestedAt_idx" ON "DiscountApproval"("requestedByEmployeeId", "requestedAt");

-- CreateIndex
CREATE INDEX "DiscountApproval_decidedByEmployeeId_decidedAt_idx" ON "DiscountApproval"("decidedByEmployeeId", "decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundReference_key" ON "Refund"("refundReference");

-- CreateIndex
CREATE INDEX "Refund_invoiceId_status_requestedAt_idx" ON "Refund"("invoiceId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "Refund_requestedByEmployeeId_requestedAt_idx" ON "Refund"("requestedByEmployeeId", "requestedAt");

-- CreateIndex
CREATE INDEX "Refund_approvedByEmployeeId_approvedAt_idx" ON "Refund"("approvedByEmployeeId", "approvedAt");

-- CreateIndex
CREATE INDEX "RefundItem_invoiceItemId_createdAt_idx" ON "RefundItem"("invoiceItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefundItem_refundId_invoiceItemId_key" ON "RefundItem"("refundId", "invoiceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_referenceNumber_key" ON "Complaint"("referenceNumber");

-- CreateIndex
CREATE INDEX "Complaint_patientId_receivedAt_idx" ON "Complaint"("patientId", "receivedAt");

-- CreateIndex
CREATE INDEX "Complaint_status_receivedAt_idx" ON "Complaint"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "Complaint_assignedToEmployeeId_status_idx" ON "Complaint"("assignedToEmployeeId", "status");

-- CreateIndex
CREATE INDEX "Complaint_createdByEmployeeId_receivedAt_idx" ON "Complaint"("createdByEmployeeId", "receivedAt");

-- CreateIndex
CREATE INDEX "ComplaintEvent_complaintId_occurredAt_idx" ON "ComplaintEvent"("complaintId", "occurredAt");

-- CreateIndex
CREATE INDEX "ComplaintEvent_actorEmployeeId_occurredAt_idx" ON "ComplaintEvent"("actorEmployeeId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentReport_referenceNumber_key" ON "IncidentReport"("referenceNumber");

-- CreateIndex
CREATE INDEX "IncidentReport_status_severity_reportedAt_idx" ON "IncidentReport"("status", "severity", "reportedAt");

-- CreateIndex
CREATE INDEX "IncidentReport_patientId_occurredAt_idx" ON "IncidentReport"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "IncidentReport_encounterId_occurredAt_idx" ON "IncidentReport"("encounterId", "occurredAt");

-- CreateIndex
CREATE INDEX "IncidentReport_assignedToEmployeeId_status_idx" ON "IncidentReport"("assignedToEmployeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_patientId_uploadedAt_idx" ON "Attachment"("patientId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Attachment_encounterId_uploadedAt_idx" ON "Attachment"("encounterId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Attachment_labResultId_idx" ON "Attachment"("labResultId");

-- CreateIndex
CREATE INDEX "Attachment_radiologyReportId_idx" ON "Attachment"("radiologyReportId");

-- CreateIndex
CREATE INDEX "Attachment_complaintId_idx" ON "Attachment"("complaintId");

-- CreateIndex
CREATE INDEX "Attachment_incidentReportId_idx" ON "Attachment"("incidentReportId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedByEmployeeId_uploadedAt_idx" ON "Attachment"("uploadedByEmployeeId", "uploadedAt");

-- CreateIndex
CREATE INDEX "Notification_patientId_status_scheduledAt_idx" ON "Notification"("patientId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_employeeId_status_scheduledAt_idx" ON "Notification"("employeeId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_channel_status_scheduledAt_idx" ON "Notification"("channel", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_occurredAt_idx" ON "AuditLog"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorEmployeeId_occurredAt_idx" ON "AuditLog"("actorEmployeeId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_occurredAt_idx" ON "AuditLog"("action", "occurredAt");

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialty" ADD CONSTRAINT "DoctorSpecialty_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialty" ADD CONSTRAINT "DoctorSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorService" ADD CONSTRAINT "DoctorService_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorService" ADD CONSTRAINT "DoctorService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorWeeklySchedule" ADD CONSTRAINT "DoctorWeeklySchedule_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorScheduleException" ADD CONSTRAINT "DoctorScheduleException_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorScheduleException" ADD CONSTRAINT "DoctorScheduleException_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientContact" ADD CONSTRAINT "PatientContact_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRelationship" ADD CONSTRAINT "PatientRelationship_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRelationship" ADD CONSTRAINT "PatientRelationship_relatedPatientId_fkey" FOREIGN KEY ("relatedPatientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRelationship" ADD CONSTRAINT "PatientRelationship_guardianVerifiedByEmployeeId_fkey" FOREIGN KEY ("guardianVerifiedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorServiceId_doctorId_fkey" FOREIGN KEY ("doctorServiceId", "doctorId") REFERENCES "DoctorService"("id", "doctorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_changedByEmployeeId_fkey" FOREIGN KEY ("changedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_changedByPatientId_fkey" FOREIGN KEY ("changedByPatientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_performedByEmployeeId_fkey" FOREIGN KEY ("performedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "QueueEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_recordedByEmployeeId_fkey" FOREIGN KEY ("recordedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "DiagnosisCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_recordedByEmployeeId_fkey" FOREIGN KEY ("recordedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_prescribedByEmployeeId_fkey" FOREIGN KEY ("prescribedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAmendment" ADD CONSTRAINT "ClinicalAmendment_clinicalNoteId_fkey" FOREIGN KEY ("clinicalNoteId") REFERENCES "ClinicalNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalAmendment" ADD CONSTRAINT "ClinicalAmendment_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredToSpecialtyId_fkey" FOREIGN KEY ("referredToSpecialtyId") REFERENCES "Specialty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredToDoctorId_fkey" FOREIGN KEY ("referredToDoctorId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestComponent" ADD CONSTRAINT "LabTestComponent_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_orderedByEmployeeId_fkey" FOREIGN KEY ("orderedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrderItem" ADD CONSTRAINT "LabOrderItem_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrderItem" ADD CONSTRAINT "LabOrderItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_collectedByEmployeeId_fkey" FOREIGN KEY ("collectedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_receivedByEmployeeId_fkey" FOREIGN KEY ("receivedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSampleItem" ADD CONSTRAINT "LabSampleItem_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "LabSample"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSampleItem" ADD CONSTRAINT "LabSampleItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "LabOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "LabOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_authoredByEmployeeId_fkey" FOREIGN KEY ("authoredByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResultValue" ADD CONSTRAINT "LabResultValue_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResultReview" ADD CONSTRAINT "LabResultReview_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResultReview" ADD CONSTRAINT "LabResultReview_reviewerEmployeeId_fkey" FOREIGN KEY ("reviewerEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabClinicalReview" ADD CONSTRAINT "LabClinicalReview_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabClinicalReview" ADD CONSTRAINT "LabClinicalReview_reviewerEmployeeId_fkey" FOREIGN KEY ("reviewerEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabCriticalCommunication" ADD CONSTRAINT "LabCriticalCommunication_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabCriticalCommunication" ADD CONSTRAINT "LabCriticalCommunication_notifiedByEmployeeId_fkey" FOREIGN KEY ("notifiedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabCriticalCommunication" ADD CONSTRAINT "LabCriticalCommunication_acknowledgedByEmployeeId_fkey" FOREIGN KEY ("acknowledgedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrder" ADD CONSTRAINT "RadiologyOrder_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrder" ADD CONSTRAINT "RadiologyOrder_orderedByEmployeeId_fkey" FOREIGN KEY ("orderedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrderItem" ADD CONSTRAINT "RadiologyOrderItem_radiologyOrderId_fkey" FOREIGN KEY ("radiologyOrderId") REFERENCES "RadiologyOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyOrderItem" ADD CONSTRAINT "RadiologyOrderItem_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "RadiologyProcedure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyExam" ADD CONSTRAINT "RadiologyExam_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "RadiologyOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyExam" ADD CONSTRAINT "RadiologyExam_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "RadiologyResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyExam" ADD CONSTRAINT "RadiologyExam_performedByEmployeeId_fkey" FOREIGN KEY ("performedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyPregnancyScreening" ADD CONSTRAINT "RadiologyPregnancyScreening_examId_fkey" FOREIGN KEY ("examId") REFERENCES "RadiologyExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyPregnancyScreening" ADD CONSTRAINT "RadiologyPregnancyScreening_recordedByEmployeeId_fkey" FOREIGN KEY ("recordedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyReport" ADD CONSTRAINT "RadiologyReport_examId_fkey" FOREIGN KEY ("examId") REFERENCES "RadiologyExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyReport" ADD CONSTRAINT "RadiologyReport_authoredByEmployeeId_fkey" FOREIGN KEY ("authoredByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyReport" ADD CONSTRAINT "RadiologyReport_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyReportReview" ADD CONSTRAINT "RadiologyReportReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "RadiologyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyReportReview" ADD CONSTRAINT "RadiologyReportReview_reviewerEmployeeId_fkey" FOREIGN KEY ("reviewerEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyClinicalReview" ADD CONSTRAINT "RadiologyClinicalReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "RadiologyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyClinicalReview" ADD CONSTRAINT "RadiologyClinicalReview_reviewerEmployeeId_fkey" FOREIGN KEY ("reviewerEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyCriticalCommunication" ADD CONSTRAINT "RadiologyCriticalCommunication_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "RadiologyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyCriticalCommunication" ADD CONSTRAINT "RadiologyCriticalCommunication_notifiedByEmployeeId_fkey" FOREIGN KEY ("notifiedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyCriticalCommunication" ADD CONSTRAINT "RadiologyCriticalCommunication_acknowledgedByEmployeeId_fkey" FOREIGN KEY ("acknowledgedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_labOrderItemId_fkey" FOREIGN KEY ("labOrderItemId") REFERENCES "LabOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_radiologyOrderItemId_fkey" FOREIGN KEY ("radiologyOrderItemId") REFERENCES "RadiologyOrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedByEmployeeId_fkey" FOREIGN KEY ("receivedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApproval" ADD CONSTRAINT "DiscountApproval_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApproval" ADD CONSTRAINT "DiscountApproval_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountApproval" ADD CONSTRAINT "DiscountApproval_decidedByEmployeeId_fkey" FOREIGN KEY ("decidedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_createdByEmployeeId_fkey" FOREIGN KEY ("createdByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintEvent" ADD CONSTRAINT "ComplaintEvent_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintEvent" ADD CONSTRAINT "ComplaintEvent_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_reportedByEmployeeId_fkey" FOREIGN KEY ("reportedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_assignedToEmployeeId_fkey" FOREIGN KEY ("assignedToEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_labResultId_fkey" FOREIGN KEY ("labResultId") REFERENCES "LabResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_radiologyReportId_fkey" FOREIGN KEY ("radiologyReportId") REFERENCES "RadiologyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_incidentReportId_fkey" FOREIGN KEY ("incidentReportId") REFERENCES "IncidentReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByEmployeeId_fkey" FOREIGN KEY ("uploadedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- -----------------------------------------------------------------------------
-- MERUNO custom PostgreSQL integrity rules (not expressible in Prisma Schema).
-- Requires PostgreSQL's standard btree_gist extension for overlap exclusion.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Master data and schedule integrity.
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_employment_dates_chk" CHECK ("hiredOn" IS NULL OR "endedOn" IS NULL OR "endedOn" >= "hiredOn");
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_experience_nonnegative_chk" CHECK ("yearsOfExperience" IS NULL OR "yearsOfExperience" >= 0);
CREATE UNIQUE INDEX "DoctorSpecialty_one_primary_per_doctor_uq" ON "DoctorSpecialty" ("doctorId") WHERE "isPrimary" = TRUE;
ALTER TABLE "DoctorService" ADD CONSTRAINT "DoctorService_valid_price_duration_chk" CHECK ("durationMinutes" > 0 AND "price" >= 0);
ALTER TABLE "DoctorWeeklySchedule" ADD CONSTRAINT "DoctorWeeklySchedule_minutes_range_chk" CHECK ("startMinuteOfDay" >= 0 AND "startMinuteOfDay" < "endMinuteOfDay" AND "endMinuteOfDay" <= 1440), ADD CONSTRAINT "DoctorWeeklySchedule_effective_dates_chk" CHECK ("effectiveUntil" IS NULL OR "effectiveUntil" >= "effectiveFrom");
ALTER TABLE "DoctorScheduleException" ADD CONSTRAINT "DoctorScheduleException_time_range_chk" CHECK ("endsAt" > "startsAt");
ALTER TABLE "PatientRelationship" ADD CONSTRAINT "PatientRelationship_not_self_chk" CHECK ("patientId" <> "relatedPatientId"), ADD CONSTRAINT "PatientRelationship_guardian_verification_chk" CHECK (NOT "isLegalGuardian" OR ("guardianVerifiedAt" IS NOT NULL AND "guardianVerifiedByEmployeeId" IS NOT NULL));
CREATE UNIQUE INDEX "PatientContact_one_primary_per_type_uq" ON "PatientContact" ("patientId", "type") WHERE "isPrimary" = TRUE;

-- Booking integrity, including race-safe overlap prevention.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_time_range_chk" CHECK ("endsAt" > "startsAt"), ADD CONSTRAINT "Appointment_duration_price_chk" CHECK ("durationMinutes" > 0 AND "bookedPrice" >= 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctor_no_overlap" EXCLUDE USING GIST ("doctorId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_no_overlap" EXCLUDE USING GIST ("patientId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&) WHERE ("status" IN ('CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION'));
ALTER TABLE "AppointmentStatusHistory" ADD CONSTRAINT "AppointmentStatusHistory_actor_matches_source_chk" CHECK (("changeSource" = 'STAFF' AND "changedByEmployeeId" IS NOT NULL AND "changedByPatientId" IS NULL) OR ("changeSource" = 'PATIENT' AND "changedByEmployeeId" IS NULL AND "changedByPatientId" IS NOT NULL) OR ("changeSource" = 'SYSTEM' AND "changedByEmployeeId" IS NULL AND "changedByPatientId" IS NULL));
ALTER TABLE "QueueEntry" ADD CONSTRAINT "QueueEntry_queue_number_positive_chk" CHECK ("queueNumber" > 0);
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_distinct_elements_chk" CHECK ("firstElement" <> "secondElement");
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_has_visit_origin_chk" CHECK ("appointmentId" IS NOT NULL OR "queueEntryId" IS NOT NULL);

-- Clinical record integrity.
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_signature_state_chk" CHECK (("status" = 'DRAFT' AND "signedAt" IS NULL) OR ("status" = 'SIGNED' AND "signedAt" IS NOT NULL));
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_positive_measurements_chk" CHECK (("temperatureC" IS NULL OR "temperatureC" > 0) AND ("systolicMmHg" IS NULL OR "systolicMmHg" > 0) AND ("diastolicMmHg" IS NULL OR "diastolicMmHg" > 0) AND ("pulseBpm" IS NULL OR "pulseBpm" > 0) AND ("respiratoryRatePerMin" IS NULL OR "respiratoryRatePerMin" > 0) AND ("oxygenSaturationPct" IS NULL OR ("oxygenSaturationPct" >= 0 AND "oxygenSaturationPct" <= 100)) AND ("heightCm" IS NULL OR "heightCm" > 0) AND ("weightKg" IS NULL OR "weightKg" > 0) AND ("bmi" IS NULL OR "bmi" > 0));
CREATE UNIQUE INDEX "EncounterDiagnosis_one_primary_per_encounter_uq" ON "EncounterDiagnosis" ("encounterId") WHERE "isPrimary" = TRUE;
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_positive_values_chk" CHECK (("durationDays" IS NULL OR "durationDays" > 0) AND ("quantity" IS NULL OR "quantity" > 0) AND "refills" >= 0);
ALTER TABLE "ClinicalAmendment" ADD CONSTRAINT "ClinicalAmendment_nonempty_reason_chk" CHECK (length(btrim("reason")) > 0 AND "previousContent" <> "correctedContent");
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_target_matches_type_chk" CHECK (("type" = 'INTERNAL' AND ("referredToSpecialtyId" IS NOT NULL OR "referredToDoctorId" IS NOT NULL) AND "externalFacilityName" IS NULL) OR ("type" = 'EXTERNAL' AND "externalFacilityName" IS NOT NULL AND "referredToSpecialtyId" IS NULL AND "referredToDoctorId" IS NULL));

-- Laboratory integrity.
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_price_turnaround_chk" CHECK ("price" >= 0 AND ("defaultTurnaroundMinutes" IS NULL OR "defaultTurnaroundMinutes" > 0));
ALTER TABLE "LabTestComponent" ADD CONSTRAINT "LabTestComponent_sort_order_chk" CHECK ("sortOrder" >= 0);
ALTER TABLE "LabOrderItem" ADD CONSTRAINT "LabOrderItem_price_nonnegative_chk" CHECK ("priceSnapshot" >= 0);
ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_rejection_reason_chk" CHECK ("status" <> 'REJECTED' OR ("rejectionReason" IS NOT NULL AND length(btrim("rejectionReason")) > 0));
ALTER TABLE "LabResultValue" ADD CONSTRAINT "LabResultValue_single_typed_value_chk" CHECK (("valueType" = 'NUMERIC' AND "valueNumeric" IS NOT NULL AND "valueText" IS NULL AND "valueBoolean" IS NULL) OR ("valueType" = 'TEXT' AND "valueText" IS NOT NULL AND "valueNumeric" IS NULL AND "valueBoolean" IS NULL) OR ("valueType" = 'BOOLEAN' AND "valueBoolean" IS NOT NULL AND "valueNumeric" IS NULL AND "valueText" IS NULL));
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_approval_release_timestamps_chk" CHECK (("status" NOT IN ('APPROVED', 'RELEASED') OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL)) AND ("status" <> 'RELEASED' OR "releasedAt" IS NOT NULL));
ALTER TABLE "LabCriticalCommunication" ADD CONSTRAINT "LabCriticalCommunication_status_timestamps_chk" CHECK (("status" = 'PENDING' OR "notifiedAt" IS NOT NULL) AND ("status" NOT IN ('ACKNOWLEDGED', 'RESOLVED') OR ("acknowledgedByEmployeeId" IS NOT NULL AND "acknowledgedAt" IS NOT NULL)) AND ("status" <> 'ESCALATED' OR "escalatedAt" IS NOT NULL) AND ("readBackConfirmedAt" IS NULL OR "readBackRequired" = TRUE));

-- Radiology integrity and room/equipment overlap prevention.
ALTER TABLE "RadiologyProcedure" ADD CONSTRAINT "RadiologyProcedure_price_duration_chk" CHECK ("price" >= 0 AND ("defaultDurationMinutes" IS NULL OR "defaultDurationMinutes" > 0));
ALTER TABLE "RadiologyExam" ADD CONSTRAINT "RadiologyExam_schedule_pair_chk" CHECK (("scheduledStartsAt" IS NULL AND "scheduledEndsAt" IS NULL) OR ("scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL AND "scheduledEndsAt" > "scheduledStartsAt")), ADD CONSTRAINT "RadiologyExam_completed_time_chk" CHECK ("status" <> 'COMPLETED' OR "performedAt" IS NOT NULL);
ALTER TABLE "RadiologyExam" ADD CONSTRAINT "RadiologyExam_resource_no_overlap" EXCLUDE USING GIST ("resourceId" WITH =, tstzrange("scheduledStartsAt", "scheduledEndsAt", '[)') WITH &&) WHERE ("resourceId" IS NOT NULL AND "scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL AND "status" IN ('SCHEDULED', 'IN_PROGRESS'));
ALTER TABLE "RadiologyReport" ADD CONSTRAINT "RadiologyReport_approval_release_timestamps_chk" CHECK (("status" NOT IN ('APPROVED', 'RELEASED') OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL)) AND ("status" <> 'RELEASED' OR "releasedAt" IS NOT NULL));
ALTER TABLE "RadiologyCriticalCommunication" ADD CONSTRAINT "RadiologyCriticalCommunication_status_timestamps_chk" CHECK (("status" = 'PENDING' OR "notifiedAt" IS NOT NULL) AND ("status" NOT IN ('ACKNOWLEDGED', 'RESOLVED') OR ("acknowledgedByEmployeeId" IS NOT NULL AND "acknowledgedAt" IS NOT NULL)) AND ("status" <> 'ESCALATED' OR "escalatedAt" IS NOT NULL) AND ("readBackConfirmedAt" IS NULL OR "readBackRequired" = TRUE));

-- Billing integrity.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amounts_consistent_chk" CHECK ("subtotal" >= 0 AND "discountTotal" >= 0 AND "discountTotal" <= "subtotal" AND "total" = ("subtotal" - "discountTotal")), ADD CONSTRAINT "Invoice_issued_timestamp_chk" CHECK ("status" = 'DRAFT' OR "issuedAt" IS NOT NULL), ADD CONSTRAINT "Invoice_void_reason_chk" CHECK ("status" <> 'VOIDED' OR ("voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND length(btrim("voidReason")) > 0));
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_amounts_source_chk" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND "discountAmount" >= 0 AND "discountAmount" <= ("unitPrice" * "quantity") AND "lineTotal" = (("unitPrice" * "quantity") - "discountAmount") AND (("sourceType" = 'SERVICE' AND "serviceCatalogId" IS NOT NULL AND "labOrderItemId" IS NULL AND "radiologyOrderItemId" IS NULL) OR ("sourceType" = 'LAB_TEST' AND "serviceCatalogId" IS NULL AND "labOrderItemId" IS NOT NULL AND "radiologyOrderItemId" IS NULL) OR ("sourceType" = 'RADIOLOGY_PROCEDURE' AND "serviceCatalogId" IS NULL AND "labOrderItemId" IS NULL AND "radiologyOrderItemId" IS NOT NULL) OR ("sourceType" = 'OTHER' AND "serviceCatalogId" IS NULL AND "labOrderItemId" IS NULL AND "radiologyOrderItemId" IS NULL)));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive_chk" CHECK ("amount" > 0), ADD CONSTRAINT "Payment_void_details_chk" CHECK (("status" = 'COMPLETED' AND "voidedAt" IS NULL AND "voidReason" IS NULL) OR ("status" = 'VOIDED' AND "voidedAt" IS NOT NULL AND "voidReason" IS NOT NULL AND length(btrim("voidReason")) > 0));
CREATE UNIQUE INDEX "Payment_one_completed_per_invoice_uq" ON "Payment" ("invoiceId") WHERE "status" = 'COMPLETED';
ALTER TABLE "DiscountApproval" ADD CONSTRAINT "DiscountApproval_amount_decision_chk" CHECK ("amount" > 0 AND ("status" NOT IN ('APPROVED', 'REJECTED') OR ("decidedByEmployeeId" IS NOT NULL AND "decidedAt" IS NOT NULL)));
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_decision_chk" CHECK ("amount" > 0 AND ("status" NOT IN ('APPROVED', 'REJECTED', 'COMPLETED') OR ("approvedByEmployeeId" IS NOT NULL AND "approvedAt" IS NOT NULL)) AND ("status" <> 'COMPLETED' OR "completedAt" IS NOT NULL));
ALTER TABLE "RefundItem" ADD CONSTRAINT "RefundItem_amount_positive_chk" CHECK ("amount" > 0);

-- Operational integrity.
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_exactly_one_owner_chk" CHECK (num_nonnulls("patientId", "encounterId", "labResultId", "radiologyReportId", "complaintId", "incidentReportId") = 1), ADD CONSTRAINT "Attachment_size_positive_chk" CHECK ("sizeBytes" > 0);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_exactly_one_recipient_chk" CHECK (num_nonnulls("patientId", "employeeId") = 1), ADD CONSTRAINT "Notification_read_timestamp_chk" CHECK ("status" <> 'READ' OR "readAt" IS NOT NULL);
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_matches_type_chk" CHECK (("actorType" = 'EMPLOYEE' AND "actorEmployeeId" IS NOT NULL) OR ("actorType" IN ('SYSTEM', 'EXTERNAL') AND "actorEmployeeId" IS NULL));



-- -----------------------------------------------------------------------------
-- MERUNO Phase 2E hardening follow-up.
-- Cross-row business invariants are checked by deferred PostgreSQL triggers.
-- -----------------------------------------------------------------------------

-- A doctor's active weekly schedule rows must not overlap on the same weekday
-- during intersecting effective-date ranges and working-minute ranges.
ALTER TABLE "DoctorWeeklySchedule"
  ADD CONSTRAINT "DoctorWeeklySchedule_no_overlap"
  EXCLUDE USING GIST (
    "doctorId" WITH =,
    "weekday" WITH =,
    daterange("effectiveFrom", "effectiveUntil", '[]') WITH &&,
    int4range("startMinuteOfDay", "endMinuteOfDay", '[)') WITH &&
  ) WHERE ("isActive" = TRUE);

-- Allow a history of discount requests, but only one unresolved request at a time.
CREATE UNIQUE INDEX "DiscountApproval_one_pending_per_invoice_uq"
  ON "DiscountApproval" ("invoiceId") WHERE "status" = 'PENDING';

-- Payment must be a single full payment in the invoice currency. The existing
-- partial unique index separately guarantees at most one completed payment.
CREATE OR REPLACE FUNCTION meruno_validate_completed_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_total numeric(10,2);
  v_invoice_currency char(3);
  v_invoice_status "InvoiceStatus";
BEGIN
  IF NEW."status" = 'COMPLETED' THEN
    SELECT "total", "currencyCode", "status"
      INTO v_invoice_total, v_invoice_currency, v_invoice_status
      FROM "Invoice"
      WHERE "id" = NEW."invoiceId"
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment invoice % does not exist', NEW."invoiceId"
        USING ERRCODE = '23503';
    END IF;

    IF v_invoice_status IN ('DRAFT', 'VOIDED') THEN
      RAISE EXCEPTION 'A completed payment requires an issued, non-voided invoice (%).', NEW."invoiceId"
        USING ERRCODE = '23514';
    END IF;

    IF NEW."amount" <> v_invoice_total THEN
      RAISE EXCEPTION 'Partial or overpayment is not allowed: payment amount % must equal invoice total %.', NEW."amount", v_invoice_total
        USING ERRCODE = '23514';
    END IF;

    IF NEW."currencyCode" <> v_invoice_currency THEN
      RAISE EXCEPTION 'Payment currency must match invoice currency for invoice %.', NEW."invoiceId"
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Payment_validate_full_payment_trg"
  BEFORE INSERT OR UPDATE OF "invoiceId", "amount", "currencyCode", "status"
  ON "Payment"
  FOR EACH ROW EXECUTE FUNCTION meruno_validate_completed_payment();

-- Keep invoice/payment/refund state consistent even if invoice totals or a
-- previously completed payment are edited after the original payment action.
CREATE OR REPLACE FUNCTION meruno_assert_payment_refund_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_invoice_total numeric(10,2);
  v_invoice_currency char(3);
  v_invoice_status "InvoiceStatus";
  v_payment_count bigint;
  v_payment_amount numeric(10,2);
  v_payment_currency char(3);
  v_completed_refund_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'Payment' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  ELSIF TG_TABLE_NAME = 'Refund' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT "total", "currencyCode", "status"
      INTO v_invoice_total, v_invoice_currency, v_invoice_status
      FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;

    IF FOUND THEN
      SELECT COUNT(*) FILTER (WHERE "status" = 'COMPLETED'),
             COALESCE(MAX("amount") FILTER (WHERE "status" = 'COMPLETED'), 0),
             MAX("currencyCode") FILTER (WHERE "status" = 'COMPLETED')
        INTO v_payment_count, v_payment_amount, v_payment_currency
        FROM "Payment" WHERE "invoiceId" = v_invoice_id;

      SELECT COALESCE(SUM("amount"), 0)
        INTO v_completed_refund_total
        FROM "Refund"
        WHERE "invoiceId" = v_invoice_id AND "status" = 'COMPLETED';

      IF v_payment_count > 1 THEN
        RAISE EXCEPTION 'An invoice can have only one completed full payment (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 1 AND (v_payment_amount <> v_invoice_total OR v_payment_currency <> v_invoice_currency) THEN
        RAISE EXCEPTION 'A completed payment must continue to match the invoice total and currency (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 1 AND v_invoice_status IN ('DRAFT', 'ISSUED', 'VOIDED') THEN
        RAISE EXCEPTION 'An invoice with a completed payment must be in PAID or a refunded state (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 0 AND v_invoice_status IN ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED') THEN
        RAISE EXCEPTION 'A paid/refunded invoice must have a completed full payment (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_payment_count = 0 AND EXISTS (
        SELECT 1 FROM "Refund"
        WHERE "invoiceId" = v_invoice_id AND "status" IN ('PENDING', 'APPROVED', 'COMPLETED')
      ) THEN
        RAISE EXCEPTION 'Active refund requests require a completed full payment (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_invoice_status = 'PAID' AND v_completed_refund_total <> 0 THEN
        RAISE EXCEPTION 'An invoice with completed refunds cannot remain in PAID state (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      ELSIF v_invoice_status = 'PARTIALLY_REFUNDED'
        AND NOT (v_completed_refund_total > 0 AND v_completed_refund_total < v_invoice_total) THEN
        RAISE EXCEPTION 'PARTIALLY_REFUNDED requires a positive completed refund below the invoice total (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      ELSIF v_invoice_status = 'REFUNDED' AND v_completed_refund_total <> v_invoice_total THEN
        RAISE EXCEPTION 'REFUNDED requires completed refunds equal to the invoice total (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      ELSIF v_invoice_status IN ('DRAFT', 'ISSUED', 'VOIDED') AND v_completed_refund_total <> 0 THEN
        RAISE EXCEPTION 'Completed refunds require a paid/refunded invoice state (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_payment_refund_state_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_payment_refund_state();

CREATE CONSTRAINT TRIGGER "Payment_invoice_state_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Payment"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_payment_refund_state();

CREATE CONSTRAINT TRIGGER "Refund_invoice_state_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Refund"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_payment_refund_state();

-- Reconcile invoice header values against all invoice lines at transaction end.
-- Accounting convention: subtotal is gross, discountTotal is the sum of line
-- discounts, and total is the sum of net line totals.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_subtotal numeric(10,2);
  v_discount_total numeric(10,2);
  v_total numeric(10,2);
  v_currency char(3);
  v_lines_subtotal numeric(10,2);
  v_lines_discount numeric(10,2);
  v_lines_total numeric(10,2);
  v_currency_mismatches bigint;
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT "subtotal", "discountTotal", "total", "currencyCode"
      INTO v_subtotal, v_discount_total, v_total, v_currency
      FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(SUM("unitPrice" * "quantity"), 0),
             COALESCE(SUM("discountAmount"), 0),
             COALESCE(SUM("lineTotal"), 0),
             COUNT(*) FILTER (WHERE "currencyCode" <> v_currency)
        INTO v_lines_subtotal, v_lines_discount, v_lines_total, v_currency_mismatches
        FROM "InvoiceItem" WHERE "invoiceId" = v_invoice_id;

      IF v_currency_mismatches > 0 THEN
        RAISE EXCEPTION 'Every invoice item must use the invoice currency (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_subtotal <> v_lines_subtotal THEN
        RAISE EXCEPTION 'Invoice subtotal % must equal gross invoice item amounts % (invoice %).', v_subtotal, v_lines_subtotal, v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_discount_total <> v_lines_discount THEN
        RAISE EXCEPTION 'Invoice discount total % must equal invoice item discounts % (invoice %).', v_discount_total, v_lines_discount, v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_total <> v_lines_total OR v_total <> (v_subtotal - v_discount_total) THEN
        RAISE EXCEPTION 'Invoice total must equal both the sum of net line totals and subtotal minus discounts (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_totals_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_totals();

CREATE CONSTRAINT TRIGGER "InvoiceItem_totals_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_totals();

-- Applied discounts may not exceed the sum of explicitly approved discounts.
-- The invoice row lock serializes concurrent invoice/approval changes.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_discount_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_subtotal numeric(10,2);
  v_discount_total numeric(10,2);
  v_approved_discount numeric(10,2);
  v_requested_discount numeric(10,2);
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'DiscountApproval' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT "subtotal", "discountTotal"
      INTO v_subtotal, v_discount_total
      FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(SUM("amount") FILTER (WHERE "status" = 'APPROVED'), 0),
             COALESCE(MAX("amount") FILTER (WHERE "status" IN ('PENDING', 'APPROVED')), 0)
        INTO v_approved_discount, v_requested_discount
        FROM "DiscountApproval" WHERE "invoiceId" = v_invoice_id;

      IF v_requested_discount > v_subtotal THEN
        RAISE EXCEPTION 'A requested discount cannot exceed invoice subtotal (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_approved_discount > v_subtotal THEN
        RAISE EXCEPTION 'Total approved discounts cannot exceed invoice subtotal (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;

      IF v_discount_total > v_approved_discount THEN
        RAISE EXCEPTION 'Applied invoice discounts cannot exceed the total approved discount amount (invoice %).', v_invoice_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_discount_approval_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_discount_approval();

CREATE CONSTRAINT TRIGGER "DiscountApproval_invoice_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "DiscountApproval"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_discount_approval();

-- An invoice must belong to the same patient as its encounter. Run at commit so
-- an invoice and its encounter can be created or updated atomically.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_encounter_patient()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
  v_invoice_patient_id text;
  v_encounter_patient_id text;
BEGIN
  IF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'Encounter' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT "id" INTO v_invoice_id FROM "Invoice" WHERE "encounterId" = OLD."id";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT "id" INTO v_invoice_id FROM "Invoice" WHERE "encounterId" = NEW."id";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
  END IF;

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    SELECT i."patientId", e."patientId"
      INTO v_invoice_patient_id, v_encounter_patient_id
      FROM "Invoice" i
      JOIN "Encounter" e ON e."id" = i."encounterId"
      WHERE i."id" = v_invoice_id;

    IF FOUND AND v_invoice_patient_id <> v_encounter_patient_id THEN
      RAISE EXCEPTION 'Invoice patient must match encounter patient (invoice %).', v_invoice_id
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Invoice_encounter_patient_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_encounter_patient();

CREATE CONSTRAINT TRIGGER "Encounter_invoice_patient_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Encounter"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_encounter_patient();

-- Diagnostic invoice items must originate from the same encounter as the invoice.
-- Service-catalog items are encounter-scoped by their parent invoice; laboratory
-- and radiology items additionally validate their source order's encounter.
CREATE OR REPLACE FUNCTION meruno_assert_invoice_item_source_encounter()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_ids text[] := ARRAY[]::text[];
  v_item_id text;
BEGIN
  IF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN v_item_ids := array_append(v_item_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_item_ids := array_append(v_item_ids, NEW."id"); END IF;
  ELSIF TG_TABLE_NAME = 'LabOrderItem' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."labOrderItemId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."labOrderItemId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'LabOrder' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "LabOrderItem" loi JOIN "InvoiceItem" ii ON ii."labOrderItemId" = loi."id"
        WHERE loi."labOrderId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "LabOrderItem" loi JOIN "InvoiceItem" ii ON ii."labOrderItemId" = loi."id"
        WHERE loi."labOrderId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyOrderItem' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."radiologyOrderItemId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids FROM "InvoiceItem" ii WHERE ii."radiologyOrderItemId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyOrder' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "RadiologyOrderItem" roi JOIN "InvoiceItem" ii ON ii."radiologyOrderItemId" = roi."id"
        WHERE roi."radiologyOrderId" = OLD."id";
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT v_item_ids || COALESCE(array_agg(ii."id"), ARRAY[]::text[])
        INTO v_item_ids
        FROM "RadiologyOrderItem" roi JOIN "InvoiceItem" ii ON ii."radiologyOrderItemId" = roi."id"
        WHERE roi."radiologyOrderId" = NEW."id";
    END IF;
  END IF;

  FOREACH v_item_id IN ARRAY v_item_ids LOOP
    IF EXISTS (
      SELECT 1
      FROM "InvoiceItem" ii
      JOIN "Invoice" inv ON inv."id" = ii."invoiceId"
      JOIN "LabOrderItem" loi ON loi."id" = ii."labOrderItemId"
      JOIN "LabOrder" lo ON lo."id" = loi."labOrderId"
      WHERE ii."id" = v_item_id
        AND ii."sourceType" = 'LAB_TEST'
        AND lo."encounterId" <> inv."encounterId"
    ) THEN
      RAISE EXCEPTION 'A laboratory invoice item must belong to the invoice encounter (item %).', v_item_id
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "InvoiceItem" ii
      JOIN "Invoice" inv ON inv."id" = ii."invoiceId"
      JOIN "RadiologyOrderItem" roi ON roi."id" = ii."radiologyOrderItemId"
      JOIN "RadiologyOrder" ro ON ro."id" = roi."radiologyOrderId"
      WHERE ii."id" = v_item_id
        AND ii."sourceType" = 'RADIOLOGY_PROCEDURE'
        AND ro."encounterId" <> inv."encounterId"
    ) THEN
      RAISE EXCEPTION 'A radiology invoice item must belong to the invoice encounter (item %).', v_item_id
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "InvoiceItem_source_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "LabOrderItem_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "LabOrderItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "LabOrder_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "LabOrder"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "RadiologyOrderItem_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "RadiologyOrderItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

CREATE CONSTRAINT TRIGGER "RadiologyOrder_invoice_encounter_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "RadiologyOrder"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_invoice_item_source_encounter();

-- Radiology exams marked scheduled/in-progress must have a resource and a full
-- time slot. Completed exams must retain performer and performance timestamp.
ALTER TABLE "RadiologyExam"
  ADD CONSTRAINT "RadiologyExam_workflow_requirements_chk"
  CHECK (
    ("status" = 'SCHEDULED' AND "resourceId" IS NOT NULL AND "scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL)
    OR ("status" = 'IN_PROGRESS' AND "resourceId" IS NOT NULL AND "scheduledStartsAt" IS NOT NULL AND "scheduledEndsAt" IS NOT NULL AND "startedAt" IS NOT NULL)
    OR ("status" = 'COMPLETED' AND "resourceId" IS NOT NULL AND "performedAt" IS NOT NULL AND "performedByEmployeeId" IS NOT NULL)
    OR "status" = 'CANCELLED'
  );

-- The assigned resource modality must match the requested procedure modality.
-- Deferred checks cover changes to either side of the relationship.
CREATE OR REPLACE FUNCTION meruno_assert_radiology_modality()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_exam_ids text[] := ARRAY[]::text[];
  v_exam_id text;
  v_procedure_modality "RadiologyModality";
  v_resource_modality "RadiologyModality";
  v_resource_id text;
BEGIN
  IF TG_TABLE_NAME = 'RadiologyExam' THEN
    IF TG_OP <> 'DELETE' THEN v_exam_ids := array_append(v_exam_ids, NEW."id"); END IF;
    IF TG_OP <> 'INSERT' THEN v_exam_ids := array_append(v_exam_ids, OLD."id"); END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyOrderItem' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT "id" INTO v_exam_id FROM "RadiologyExam" WHERE "orderItemId" = NEW."id";
      IF FOUND THEN v_exam_ids := array_append(v_exam_ids, v_exam_id); END IF;
    END IF;
    IF TG_OP <> 'INSERT' THEN
      SELECT "id" INTO v_exam_id FROM "RadiologyExam" WHERE "orderItemId" = OLD."id";
      IF FOUND THEN v_exam_ids := array_append(v_exam_ids, v_exam_id); END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyProcedure' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT COALESCE(array_agg(e."id"), ARRAY[]::text[]) INTO v_exam_ids
        FROM "RadiologyExam" e JOIN "RadiologyOrderItem" oi ON oi."id" = e."orderItemId"
        WHERE oi."procedureId" = NEW."id";
    END IF;
  ELSIF TG_TABLE_NAME = 'RadiologyResource' THEN
    IF TG_OP <> 'DELETE' THEN
      SELECT COALESCE(array_agg(e."id"), ARRAY[]::text[]) INTO v_exam_ids
        FROM "RadiologyExam" e WHERE e."resourceId" = NEW."id";
    END IF;
  END IF;

  FOREACH v_exam_id IN ARRAY v_exam_ids LOOP
    SELECT p."modality", r."modality", e."resourceId"
      INTO v_procedure_modality, v_resource_modality, v_resource_id
      FROM "RadiologyExam" e
      JOIN "RadiologyOrderItem" oi ON oi."id" = e."orderItemId"
      JOIN "RadiologyProcedure" p ON p."id" = oi."procedureId"
      LEFT JOIN "RadiologyResource" r ON r."id" = e."resourceId"
      WHERE e."id" = v_exam_id;

    IF FOUND AND v_resource_id IS NOT NULL AND v_procedure_modality <> v_resource_modality THEN
      RAISE EXCEPTION 'Radiology resource modality must match procedure modality (exam %).', v_exam_id
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "RadiologyExam_modality_deferred_trg"
  AFTER INSERT OR UPDATE ON "RadiologyExam"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

CREATE CONSTRAINT TRIGGER "RadiologyOrderItem_modality_deferred_trg"
  AFTER INSERT OR UPDATE ON "RadiologyOrderItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

CREATE CONSTRAINT TRIGGER "RadiologyProcedure_modality_deferred_trg"
  AFTER UPDATE ON "RadiologyProcedure"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

CREATE CONSTRAINT TRIGGER "RadiologyResource_modality_deferred_trg"
  AFTER UPDATE ON "RadiologyResource"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_radiology_modality();

-- Serialize invoice-item and refund operations by locking their invoice rows
-- before deferred reconciliation and balance checks run.
CREATE OR REPLACE FUNCTION meruno_lock_invoice_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_ids text[] := ARRAY[]::text[];
  v_invoice_id text;
BEGIN
  IF TG_TABLE_NAME = 'Refund' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  ELSIF TG_TABLE_NAME = 'RefundItem' THEN
    IF TG_OP <> 'INSERT' THEN
      SELECT "invoiceId" INTO v_invoice_id FROM "Refund" WHERE "id" = OLD."refundId";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
    IF TG_OP <> 'DELETE' THEN
      SELECT "invoiceId" INTO v_invoice_id FROM "Refund" WHERE "id" = NEW."refundId";
      IF FOUND THEN v_invoice_ids := array_append(v_invoice_ids, v_invoice_id); END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId"); END IF;
  END IF;

  FOR v_invoice_id IN
    SELECT DISTINCT u.invoice_id
      FROM unnest(v_invoice_ids) AS u(invoice_id)
      WHERE u.invoice_id IS NOT NULL
      ORDER BY u.invoice_id
  LOOP
    PERFORM 1 FROM "Invoice" WHERE "id" = v_invoice_id FOR UPDATE;
  END LOOP;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Refund_lock_invoice_trg"
  BEFORE INSERT OR UPDATE OR DELETE ON "Refund"
  FOR EACH ROW EXECUTE FUNCTION meruno_lock_invoice_integrity();

CREATE TRIGGER "RefundItem_lock_invoice_trg"
  BEFORE INSERT OR UPDATE OR DELETE ON "RefundItem"
  FOR EACH ROW EXECUTE FUNCTION meruno_lock_invoice_integrity();

CREATE TRIGGER "InvoiceItem_lock_invoice_integrity_trg"
  BEFORE INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  FOR EACH ROW EXECUTE FUNCTION meruno_lock_invoice_integrity();

-- Validate refund-to-invoice ownership, refund header/item reconciliation,
-- currency consistency, and outstanding refund caps per line and invoice.
CREATE OR REPLACE FUNCTION meruno_assert_refund_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_refund_ids text[] := ARRAY[]::text[];
  v_invoice_item_ids text[] := ARRAY[]::text[];
  v_invoice_ids text[] := ARRAY[]::text[];
  v_id text;
  v_refund_invoice_id text;
  v_refund_amount numeric(10,2);
  v_refund_currency char(3);
  v_refund_status "RefundStatus";
  v_items_total numeric;
  v_item_invoice_id text;
  v_item_limit numeric(10,2);
  v_invoice_total numeric(10,2);
  v_invoice_currency char(3);
  v_active_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'Refund' THEN
    IF TG_OP <> 'INSERT' THEN
      v_refund_ids := array_append(v_refund_ids, OLD."id");
      v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId");
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_refund_ids := array_append(v_refund_ids, NEW."id");
      v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId");
    END IF;
  ELSIF TG_TABLE_NAME = 'RefundItem' THEN
    IF TG_OP <> 'INSERT' THEN
      v_refund_ids := array_append(v_refund_ids, OLD."refundId");
      v_invoice_item_ids := array_append(v_invoice_item_ids, OLD."invoiceItemId");
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_refund_ids := array_append(v_refund_ids, NEW."refundId");
      v_invoice_item_ids := array_append(v_invoice_item_ids, NEW."invoiceItemId");
    END IF;
  ELSIF TG_TABLE_NAME = 'InvoiceItem' THEN
    IF TG_OP <> 'INSERT' THEN
      v_invoice_item_ids := array_append(v_invoice_item_ids, OLD."id");
      v_invoice_ids := array_append(v_invoice_ids, OLD."invoiceId");
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_invoice_item_ids := array_append(v_invoice_item_ids, NEW."id");
      v_invoice_ids := array_append(v_invoice_ids, NEW."invoiceId");
    END IF;
  ELSIF TG_TABLE_NAME = 'Invoice' THEN
    IF TG_OP <> 'INSERT' THEN v_invoice_ids := array_append(v_invoice_ids, OLD."id"); END IF;
    IF TG_OP <> 'DELETE' THEN v_invoice_ids := array_append(v_invoice_ids, NEW."id"); END IF;
  END IF;

  IF cardinality(v_invoice_item_ids) > 0 THEN
    SELECT v_refund_ids || COALESCE(array_agg(DISTINCT ri."refundId"), ARRAY[]::text[])
      INTO v_refund_ids
      FROM "RefundItem" ri
      WHERE ri."invoiceItemId" = ANY(v_invoice_item_ids);
  END IF;

  IF cardinality(v_refund_ids) > 0 THEN
    SELECT v_invoice_ids || COALESCE(array_agg(DISTINCT r."invoiceId"), ARRAY[]::text[])
      INTO v_invoice_ids
      FROM "Refund" r WHERE r."id" = ANY(v_refund_ids);
  END IF;

  IF cardinality(v_invoice_item_ids) > 0 THEN
    SELECT v_invoice_ids || COALESCE(array_agg(DISTINCT ii."invoiceId"), ARRAY[]::text[])
      INTO v_invoice_ids
      FROM "InvoiceItem" ii WHERE ii."id" = ANY(v_invoice_item_ids);
  END IF;

  FOREACH v_id IN ARRAY v_refund_ids LOOP
    SELECT "invoiceId", "amount", "currencyCode", "status"
      INTO v_refund_invoice_id, v_refund_amount, v_refund_currency, v_refund_status
      FROM "Refund" WHERE "id" = v_id;

    IF FOUND THEN
      SELECT COALESCE(SUM("amount"), 0) INTO v_items_total
        FROM "RefundItem" WHERE "refundId" = v_id;

      IF v_items_total <> v_refund_amount THEN
        RAISE EXCEPTION 'Refund amount must equal the sum of its refund items (refund %).', v_id
          USING ERRCODE = '23514';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM "RefundItem" ri
        JOIN "InvoiceItem" ii ON ii."id" = ri."invoiceItemId"
        JOIN "Invoice" inv ON inv."id" = ii."invoiceId"
        WHERE ri."refundId" = v_id
          AND (ii."invoiceId" <> v_refund_invoice_id
               OR ii."currencyCode" <> v_refund_currency
               OR inv."currencyCode" <> v_refund_currency)
      ) THEN
        RAISE EXCEPTION 'Every refund item must belong to the refund invoice and use its currency (refund %).', v_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  FOREACH v_id IN ARRAY v_invoice_item_ids LOOP
    SELECT "invoiceId", "lineTotal" INTO v_item_invoice_id, v_item_limit
      FROM "InvoiceItem" WHERE "id" = v_id;

    IF FOUND THEN
      SELECT COALESCE(SUM(ri."amount"), 0) INTO v_active_total
        FROM "RefundItem" ri
        JOIN "Refund" r ON r."id" = ri."refundId"
        WHERE ri."invoiceItemId" = v_id
          AND r."status" IN ('PENDING', 'APPROVED', 'COMPLETED');

      IF v_active_total > v_item_limit THEN
        RAISE EXCEPTION 'Active refunds cannot exceed the invoice item line total (invoice item %).', v_id
          USING ERRCODE = '23514';
      END IF;

      v_invoice_ids := array_append(v_invoice_ids, v_item_invoice_id);
    END IF;
  END LOOP;

  FOREACH v_id IN ARRAY v_invoice_ids LOOP
    SELECT "total", "currencyCode" INTO v_invoice_total, v_invoice_currency
      FROM "Invoice" WHERE "id" = v_id FOR UPDATE;

    IF FOUND THEN
      SELECT COALESCE(SUM("amount"), 0) INTO v_active_total
        FROM "Refund"
        WHERE "invoiceId" = v_id
          AND "status" IN ('PENDING', 'APPROVED', 'COMPLETED');

      IF v_active_total > v_invoice_total THEN
        RAISE EXCEPTION 'Active refunds cannot exceed the invoice total (invoice %).', v_id
          USING ERRCODE = '23514';
      END IF;

      IF v_active_total > 0 AND NOT EXISTS (
        SELECT 1 FROM "Payment"
        WHERE "invoiceId" = v_id AND "status" = 'COMPLETED'
      ) THEN
        RAISE EXCEPTION 'Refund requests require a completed full payment (invoice %).', v_id
          USING ERRCODE = '23514';
      END IF;

      IF EXISTS (
        SELECT 1 FROM "Refund" r
        WHERE r."invoiceId" = v_id
          AND r."status" IN ('PENDING', 'APPROVED', 'COMPLETED')
          AND r."currencyCode" <> v_invoice_currency
      ) THEN
        RAISE EXCEPTION 'Refund currency must match invoice currency (invoice %).', v_id
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "Refund_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Refund"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();

CREATE CONSTRAINT TRIGGER "RefundItem_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "RefundItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();

CREATE CONSTRAINT TRIGGER "InvoiceItem_refund_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "InvoiceItem"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();

CREATE CONSTRAINT TRIGGER "Invoice_refund_integrity_deferred_trg"
  AFTER INSERT OR UPDATE OR DELETE ON "Invoice"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION meruno_assert_refund_integrity();
