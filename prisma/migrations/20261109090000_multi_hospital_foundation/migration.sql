CREATE TYPE "IdentityVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'REVOKED');
CREATE TYPE "AccessGrantStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "ReferralStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUESTED', 'ACCEPTED', 'DECLINED', 'REDIRECTED', 'APPOINTMENT_SCHEDULED', 'ARRIVAL_CONFIRMED', 'TREATMENT_IN_PROGRESS', 'DISCHARGED', 'COUNTER_REFERRAL_SUBMITTED', 'COMPLETED');
CREATE TYPE "ClinicalInsightType" AS ENUM ('RISK_ASSESSMENT', 'PATTERN_DETECTION', 'CLINICAL_INSIGHT', 'LONGITUDINAL_SUMMARY');

CREATE TABLE "Hospital" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Hospital_slug_key" ON "Hospital"("slug");
INSERT INTO "Hospital" ("id", "name", "slug") VALUES ('legacy-general-hospital', 'General Hospital', 'general-hospital');

ALTER TABLE "StaffMember" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "StaffMember" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AuditLog" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Department" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "CardType" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Visit" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Communication" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Request" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "AiArtifact" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "AiArtifact" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'ANTHROPIC';
ALTER TABLE "AiArtifact" ADD COLUMN "promptVersion" TEXT;
ALTER TABLE "AiArtifact" ADD COLUMN "generatedById" TEXT;
ALTER TABLE "Vacancy" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Application" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "RolePermission" ADD COLUMN "hospitalId" TEXT;

UPDATE "StaffMember" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "AuditLog" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Department" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "CardType" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Patient" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Visit" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Appointment" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Communication" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Request" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Notification" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "AiArtifact" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Vacancy" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Candidate" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "Application" SET "hospitalId" = 'legacy-general-hospital';
UPDATE "RolePermission" SET "hospitalId" = 'legacy-general-hospital';

ALTER TABLE "Department" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "CardType" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Patient" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Visit" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Communication" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Request" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "AiArtifact" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Vacancy" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Candidate" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Application" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "RolePermission" ALTER COLUMN "hospitalId" SET NOT NULL;

DROP INDEX "Department_name_key";
DROP INDEX "Department_slug_key";
DROP INDEX "CardType_name_key";
DROP INDEX "CardType_seriesCode_key";
DROP INDEX "Patient_hospitalNumber_key";
DROP INDEX "RolePermission_role_permission_key";
CREATE UNIQUE INDEX "Department_hospitalId_name_key" ON "Department"("hospitalId", "name");
CREATE UNIQUE INDEX "Department_hospitalId_slug_key" ON "Department"("hospitalId", "slug");
CREATE UNIQUE INDEX "CardType_hospitalId_name_key" ON "CardType"("hospitalId", "name");
CREATE UNIQUE INDEX "CardType_hospitalId_seriesCode_key" ON "CardType"("hospitalId", "seriesCode");
CREATE UNIQUE INDEX "Patient_hospitalId_hospitalNumber_key" ON "Patient"("hospitalId", "hospitalNumber");
CREATE UNIQUE INDEX "StaffMember_hospitalId_id_key" ON "StaffMember"("hospitalId", "id");
CREATE UNIQUE INDEX "Department_hospitalId_id_key" ON "Department"("hospitalId", "id");
CREATE UNIQUE INDEX "CardType_hospitalId_id_key" ON "CardType"("hospitalId", "id");
CREATE UNIQUE INDEX "Patient_hospitalId_id_key" ON "Patient"("hospitalId", "id");
CREATE UNIQUE INDEX "Visit_hospitalId_id_key" ON "Visit"("hospitalId", "id");
CREATE UNIQUE INDEX "Request_hospitalId_id_key" ON "Request"("hospitalId", "id");
CREATE UNIQUE INDEX "RolePermission_hospitalId_role_permission_key" ON "RolePermission"("hospitalId", "role", "permission");

CREATE INDEX "StaffMember_hospitalId_idx" ON "StaffMember"("hospitalId");
CREATE INDEX "AuditLog_hospitalId_createdAt_idx" ON "AuditLog"("hospitalId", "createdAt");
CREATE INDEX "Department_hospitalId_idx" ON "Department"("hospitalId");
CREATE INDEX "CardType_hospitalId_idx" ON "CardType"("hospitalId");
CREATE INDEX "Patient_hospitalId_fullName_idx" ON "Patient"("hospitalId", "fullName");
CREATE INDEX "Patient_hospitalId_phone_idx" ON "Patient"("hospitalId", "phone");
CREATE INDEX "Visit_hospitalId_patientId_idx" ON "Visit"("hospitalId", "patientId");
CREATE INDEX "Appointment_hospitalId_scheduledFor_idx" ON "Appointment"("hospitalId", "scheduledFor");
CREATE INDEX "Communication_hospitalId_patientId_idx" ON "Communication"("hospitalId", "patientId");
CREATE INDEX "Request_hospitalId_toDepartmentId_status_idx" ON "Request"("hospitalId", "toDepartmentId", "status");
CREATE INDEX "Notification_hospitalId_departmentId_readAt_idx" ON "Notification"("hospitalId", "departmentId", "readAt");
CREATE INDEX "AiArtifact_hospitalId_createdAt_idx" ON "AiArtifact"("hospitalId", "createdAt");
CREATE INDEX "Vacancy_hospitalId_status_idx" ON "Vacancy"("hospitalId", "status");
CREATE INDEX "Candidate_hospitalId_email_idx" ON "Candidate"("hospitalId", "email");
CREATE INDEX "Application_hospitalId_vacancyId_stage_idx" ON "Application"("hospitalId", "vacancyId", "stage");
CREATE INDEX "RolePermission_hospitalId_idx" ON "RolePermission"("hospitalId");

ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CardType" ADD CONSTRAINT "CardType_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CareNexaIdentity" (
  "id" TEXT NOT NULL,
  "universalPatientNumber" TEXT NOT NULL,
  "verificationStatus" "IdentityVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verificationMethod" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareNexaIdentity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CareNexaIdentity_universalPatientNumber_key" ON "CareNexaIdentity"("universalPatientNumber");

CREATE TABLE "PatientHospitalLink" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verificationStatus" "IdentityVerificationStatus" NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "PatientHospitalLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PatientHospitalLink_hospitalId_patientId_key" ON "PatientHospitalLink"("hospitalId", "patientId");
CREATE UNIQUE INDEX "PatientHospitalLink_identityId_hospitalId_key" ON "PatientHospitalLink"("identityId", "hospitalId");
CREATE INDEX "PatientHospitalLink_identityId_idx" ON "PatientHospitalLink"("identityId");
INSERT INTO "CareNexaIdentity" ("id", "universalPatientNumber", "verificationStatus")
SELECT 'legacy-identity-' || p."id", 'CNX-' || substr(md5(p."id"), 1, 20), 'PENDING'::"IdentityVerificationStatus"
FROM "Patient" p;
INSERT INTO "PatientHospitalLink" ("id", "identityId", "hospitalId", "patientId", "verificationStatus")
SELECT 'legacy-patient-link-' || p."id", 'legacy-identity-' || p."id", p."hospitalId", p."id", 'PENDING'::"IdentityVerificationStatus"
FROM "Patient" p;

CREATE TABLE "PatientIdentityVerification" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "verifiedById" TEXT NOT NULL,
  "status" "IdentityVerificationStatus" NOT NULL,
  "method" TEXT NOT NULL,
  "evidenceReference" TEXT,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PatientIdentityVerification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientIdentityVerification_identityId_hospitalId_status_idx" ON "PatientIdentityVerification"("identityId", "hospitalId", "status");
CREATE INDEX "PatientIdentityVerification_patientId_idx" ON "PatientIdentityVerification"("patientId");

CREATE TABLE "PatientAccessGrant" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "sourceHospitalId" TEXT NOT NULL,
  "receivingHospitalId" TEXT NOT NULL,
  "requestingStaffId" TEXT,
  "purpose" TEXT NOT NULL,
  "recordCategories" TEXT[] NOT NULL,
  "status" "AccessGrantStatus" NOT NULL DEFAULT 'PENDING',
  "authorizationEvidence" TEXT,
  "authorizedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referralId" TEXT,
  CONSTRAINT "PatientAccessGrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PatientAccessGrant_identityId_receivingHospitalId_status_idx" ON "PatientAccessGrant"("identityId", "receivingHospitalId", "status");
CREATE INDEX "PatientAccessGrant_sourceHospitalId_receivingHospitalId_idx" ON "PatientAccessGrant"("sourceHospitalId", "receivingHospitalId");
CREATE INDEX "PatientAccessGrant_expiresAt_idx" ON "PatientAccessGrant"("expiresAt");

CREATE TABLE "EmergencyAccessEvent" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "sourceHospitalId" TEXT NOT NULL,
  "accessingHospitalId" TEXT NOT NULL,
  "referralId" TEXT,
  "grantedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "recordCategories" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "EmergencyAccessEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmergencyAccessEvent_identityId_accessingHospitalId_endedAt_idx" ON "EmergencyAccessEvent"("identityId", "accessingHospitalId", "endedAt");
CREATE INDEX "EmergencyAccessEvent_expiresAt_idx" ON "EmergencyAccessEvent"("expiresAt");

CREATE TABLE "Referral" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "sourceVisitId" TEXT,
  "sourceHospitalId" TEXT NOT NULL,
  "destinationHospitalId" TEXT NOT NULL,
  "sourceDepartmentId" TEXT,
  "destinationDepartmentId" TEXT,
  "referringStaffId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "urgency" "RequestUrgency" NOT NULL DEFAULT 'ROUTINE',
  "requestedService" TEXT NOT NULL,
  "clinicalInformation" JSONB NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'DRAFT',
  "appointmentScheduledFor" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Referral_sourceHospitalId_status_createdAt_idx" ON "Referral"("sourceHospitalId", "status", "createdAt");
CREATE INDEX "Referral_destinationHospitalId_status_createdAt_idx" ON "Referral"("destinationHospitalId", "status", "createdAt");
CREATE INDEX "Referral_identityId_idx" ON "Referral"("identityId");
CREATE INDEX "Referral_patientId_idx" ON "Referral"("patientId");
CREATE INDEX "Referral_sourceVisitId_idx" ON "Referral"("sourceVisitId");
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmergencyAccessEvent" ADD CONSTRAINT "EmergencyAccessEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ReferralEvent" (
  "id" TEXT NOT NULL,
  "referralId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "status" "ReferralStatus" NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReferralEvent_referralId_createdAt_idx" ON "ReferralEvent"("referralId", "createdAt");

CREATE TABLE "ClinicalInsight" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "identityId" TEXT,
  "patientId" TEXT NOT NULL,
  "visitId" TEXT,
  "type" "ClinicalInsightType" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "evidence" JSONB NOT NULL,
  "model" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "requiresReview" BOOLEAN NOT NULL DEFAULT true,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalInsight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClinicalInsight_hospitalId_patientId_createdAt_idx" ON "ClinicalInsight"("hospitalId", "patientId", "createdAt");
CREATE INDEX "ClinicalInsight_identityId_idx" ON "ClinicalInsight"("identityId");
CREATE INDEX "ClinicalInsight_visitId_idx" ON "ClinicalInsight"("visitId");

ALTER TABLE "PatientHospitalLink" ADD CONSTRAINT "PatientHospitalLink_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "CareNexaIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientHospitalLink" ADD CONSTRAINT "PatientHospitalLink_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientHospitalLink" ADD CONSTRAINT "PatientHospitalLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientIdentityVerification" ADD CONSTRAINT "PatientIdentityVerification_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "CareNexaIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientIdentityVerification" ADD CONSTRAINT "PatientIdentityVerification_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientIdentityVerification" ADD CONSTRAINT "PatientIdentityVerification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientIdentityVerification" ADD CONSTRAINT "PatientIdentityVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "CareNexaIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_sourceHospitalId_fkey" FOREIGN KEY ("sourceHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_receivingHospitalId_fkey" FOREIGN KEY ("receivingHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_requestingStaffId_fkey" FOREIGN KEY ("requestingStaffId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmergencyAccessEvent" ADD CONSTRAINT "EmergencyAccessEvent_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "CareNexaIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyAccessEvent" ADD CONSTRAINT "EmergencyAccessEvent_sourceHospitalId_fkey" FOREIGN KEY ("sourceHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyAccessEvent" ADD CONSTRAINT "EmergencyAccessEvent_accessingHospitalId_fkey" FOREIGN KEY ("accessingHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmergencyAccessEvent" ADD CONSTRAINT "EmergencyAccessEvent_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "CareNexaIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_sourceVisitId_fkey" FOREIGN KEY ("sourceVisitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_sourceHospitalId_fkey" FOREIGN KEY ("sourceHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_destinationHospitalId_fkey" FOREIGN KEY ("destinationHospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_sourceDepartmentId_fkey" FOREIGN KEY ("sourceDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_destinationDepartmentId_fkey" FOREIGN KEY ("destinationDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referringStaffId_fkey" FOREIGN KEY ("referringStaffId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "StaffMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalInsight" ADD CONSTRAINT "ClinicalInsight_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalInsight" ADD CONSTRAINT "ClinicalInsight_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "CareNexaIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalInsight" ADD CONSTRAINT "ClinicalInsight_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalInsight" ADD CONSTRAINT "ClinicalInsight_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalInsight" ADD CONSTRAINT "ClinicalInsight_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
