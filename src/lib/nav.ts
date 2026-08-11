import type { StaffRole } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: "Administrator",
  RECORDS_OFFICER: "Records Officer",
  RECEPTIONIST: "Receptionist",
  NURSE: "Nurse",
  CLINICIAN: "Clinician",
  LAB_SCIENTIST: "Laboratory Scientist",
  PHARMACIST: "Pharmacist",
  RECRUITER: "Recruiter",
};

