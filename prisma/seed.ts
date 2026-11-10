import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// Every seeded staff account shares this password for demo convenience.
const DEMO_PASSWORD = "carenexa2026";

async function seedCardTypes(hospitalId: string) {
  const cardTypes = [
    { name: "General Outpatient", seriesCode: "GOP", description: "Walk-in patients paying out of pocket for general care." },
    { name: "Private", seriesCode: "PVT", description: "Privately insured or self-pay premium patients." },
    { name: "Antenatal", seriesCode: "ANC", description: "Pregnant patients enrolled in antenatal care." },
    { name: "Child Welfare", seriesCode: "CWC", description: "Paediatric patients under child welfare clinic care." },
    { name: "Staff", seriesCode: "STF", description: "Hospital staff and their dependents receiving care." },
  ];

  const created: Record<string, string> = {};
  for (const ct of cardTypes) {
    const existing = await db.cardType.findFirst({ where: { hospitalId, seriesCode: ct.seriesCode } });
    const row = existing ?? await db.cardType.create({ data: { ...ct, hospitalId } });
    created[ct.seriesCode] = row.id;
  }
  console.log(`Seeded ${cardTypes.length} card types.`);
  return created;
}

type DepartmentSeed = { name: string; slug: string; description: string; acceptsRequestTypes: string[]; resultFields: Prisma.InputJsonObject };

async function seedDepartments(hospitalId: string, extra: DepartmentSeed[] = []) {
  const departments = [
    {
      name: "Front Desk / Records",
      slug: "records",
      description: "Front desk, patient registration, filing, and hospital number issuance.",
      acceptsRequestTypes: ["File Retrieval"],
      resultFields: { fields: [{ name: "note", label: "Note", type: "text" }] },
    },
    {
      name: "Nursing",
      slug: "nursing",
      description: "Triage, vitals capture, and ward nursing care.",
      acceptsRequestTypes: ["Vitals Check", "Ward Observation"],
      resultFields: {
        fields: [
          { name: "systolicBp", label: "Systolic BP (mmHg)", type: "number" },
          { name: "diastolicBp", label: "Diastolic BP (mmHg)", type: "number" },
          { name: "temperatureC", label: "Temperature (°C)", type: "number" },
          { name: "pulseBpm", label: "Pulse (bpm)", type: "number" },
          { name: "respiratoryRate", label: "Respiratory rate (/min)", type: "number" },
          { name: "weightKg", label: "Weight (kg)", type: "number" },
        ],
      },
    },
    {
      name: "Outpatient / Clinician",
      slug: "clinician",
      description: "Consultation, examination, diagnosis, and prescribing.",
      acceptsRequestTypes: ["Clinical Review", "Second Opinion"],
      resultFields: { fields: [{ name: "note", label: "Clinical note", type: "text" }] },
    },
    {
      name: "Laboratory",
      slug: "lab",
      description: "Diagnostic testing on blood, urine, and other specimens.",
      acceptsRequestTypes: [
        "Full Blood Count",
        "Fasting Blood Glucose",
        "Malaria Parasite Test",
        "Widal Test",
        "Genotype Test",
        "Urinalysis",
        "Liver Function Test",
        "Renal Function Test",
        "HIV Screening",
      ],
      resultFields: {
        fields: [
          { name: "testName", label: "Test", type: "text" },
          { name: "value", label: "Value", type: "number" },
          { name: "unit", label: "Unit", type: "text" },
          { name: "referenceLow", label: "Reference low", type: "number" },
          { name: "referenceHigh", label: "Reference high", type: "number" },
        ],
      },
    },
    {
      name: "Radiology",
      slug: "radiology",
      description: "X-ray, ultrasound, and imaging services.",
      acceptsRequestTypes: ["X-Ray", "Abdominal Ultrasound", "Obstetric Scan"],
      resultFields: { fields: [{ name: "findings", label: "Findings", type: "text" }] },
    },
    {
      name: "Pharmacy",
      slug: "pharmacy",
      description: "Drug dispensing against prescriptions.",
      acceptsRequestTypes: ["Dispense Prescription"],
      resultFields: { fields: [{ name: "quantity", label: "Quantity dispensed", type: "text" }] },
    },
    {
      name: "Physiotherapy",
      slug: "physiotherapy",
      description: "Rehabilitation and physical therapy.",
      acceptsRequestTypes: ["Physiotherapy Assessment", "Rehabilitation Session"],
      resultFields: { fields: [{ name: "note", label: "Session note", type: "text" }] },
    },
    {
      name: "Wards",
      slug: "wards",
      description: "Inpatient admission and ward-based nursing care.",
      acceptsRequestTypes: ["Admission", "Ward Round Review"],
      resultFields: { fields: [{ name: "note", label: "Ward note", type: "text" }] },
    },
    {
      name: "Emergency",
      slug: "emergency",
      description: "Acute and trauma care, bypassing normal routing when needed.",
      acceptsRequestTypes: ["Emergency Triage", "Trauma Review"],
      resultFields: { fields: [{ name: "note", label: "Emergency note", type: "text" }] },
    },
    {
      name: "Administration",
      slug: "administration",
      description: "Hospital administration: departments, staff, and system configuration.",
      acceptsRequestTypes: [],
      resultFields: { fields: [] },
    },
    {
      name: "Recruitment",
      slug: "recruitment",
      description: "Vacancies, applications, screening, and hiring.",
      acceptsRequestTypes: [],
      resultFields: { fields: [] },
    },
  ];

  const created: Record<string, string> = {};
  const all: DepartmentSeed[] = [...departments, ...extra];
  for (const dept of all) {
    const existing = await db.department.findFirst({ where: { hospitalId, slug: dept.slug } });
    const row = existing ?? await db.department.create({ data: { ...dept, hospitalId } });
    created[dept.slug] = row.id;
  }
  console.log(`Seeded ${all.length} departments.`);
  return created;
}

type StaffOverride = { fullName: string; jobTitle?: string };

async function seedStaff(departmentIds: Record<string, string>, hospitalId: string, emailSuffix = "", overrides: Record<string, StaffOverride> = {}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const staff = [
    { fullName: "Ngozi Adebayo", email: "admin@carenexa.cloud", role: "ADMIN" as const, jobTitle: "Hospital Administrator", departmentSlug: "administration" },
    { fullName: "Chidinma Okafor", email: "records@carenexa.cloud", role: "RECORDS_OFFICER" as const, jobTitle: "Records Officer", departmentSlug: "records" },
    { fullName: "Blessing Eze", email: "reception@carenexa.cloud", role: "RECEPTIONIST" as const, jobTitle: "Front Desk Receptionist", departmentSlug: "records" },
    { fullName: "Grace Okonkwo", email: "nurse@carenexa.cloud", role: "NURSE" as const, jobTitle: "Nursing Officer", departmentSlug: "nursing" },
    { fullName: "Folake Bello", email: "matron@carenexa.cloud", role: "NURSE" as const, jobTitle: "Matron", departmentSlug: "nursing" },
    { fullName: "Dr. Emeka Nwosu", email: "clinician@carenexa.cloud", role: "CLINICIAN" as const, jobTitle: "Medical Officer", departmentSlug: "clinician" },
    { fullName: "Dr. Aisha Bello", email: "consultant@carenexa.cloud", role: "CLINICIAN" as const, jobTitle: "Consultant Physician", departmentSlug: "clinician" },
    { fullName: "Tunde Fashola", email: "lab@carenexa.cloud", role: "LAB_SCIENTIST" as const, jobTitle: "Laboratory Scientist II", departmentSlug: "lab" },
    { fullName: "Chukwuemeka Obi", email: "pharmacist@carenexa.cloud", role: "PHARMACIST" as const, jobTitle: "Pharmacist", departmentSlug: "pharmacy" },
    { fullName: "Yetunde Balogun", email: "recruiter@carenexa.cloud", role: "RECRUITER" as const, jobTitle: "HR / Recruitment Officer", departmentSlug: "recruitment" },
  ];

  const created: Record<string, string> = {};
  for (const s of staff) {
    const email = emailSuffix ? s.email.replace("@carenexa.cloud", `${emailSuffix}@carenexa.cloud`) : s.email;
    const override = overrides[s.email];
    const fullName = override?.fullName ?? s.fullName;
    const jobTitle = override?.jobTitle ?? s.jobTitle;
    const row = await db.staffMember.upsert({
      where: { email },
      update: { hospitalId, ...(override ? { fullName, jobTitle } : {}) },
      create: {
        fullName,
        email,
        passwordHash,
        role: s.role,
        jobTitle,
        hospitalId,
        departmentId: departmentIds[s.departmentSlug],
      },
    });
    created[email] = row.id;
  }
  console.log(`Seeded ${staff.length} staff accounts. Demo password for all: "${DEMO_PASSWORD}"`);
  return created;
}

// ---------------------------------------------------------------------------
// Patients & visit history — 12 months of coherent, varied stories.
// ---------------------------------------------------------------------------

const DAY_MS = 1000 * 60 * 60 * 24;

async function issueHospitalNumber(cardTypeId: string, seriesCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const existing = await db.hospitalNumberCounter.findUnique({ where: { cardTypeId_year: { cardTypeId, year } } });
  const counter = existing
    ? await db.hospitalNumberCounter.update({ where: { id: existing.id }, data: { lastNumber: existing.lastNumber + 1 } })
    : await db.hospitalNumberCounter.create({ data: { cardTypeId, year, lastNumber: 1 } });
  return `${seriesCode}/${year}/${String(counter.lastNumber).padStart(5, "0")}`;
}

type LabSpec = { testName: string; value?: number; unit?: string; low?: number; high?: number; qualitative?: string; abnormal?: boolean };
type RxSpec = { drugName: string; dosage: string; frequency: string; duration: string; dispensed?: boolean };

type VisitSpec = {
  monthsAgo: number;
  presentingComplaint: string;
  vitals?: { systolicBp?: number; diastolicBp?: number; temperatureC?: number; pulseBpm?: number; respiratoryRate?: number; weightKg?: number };
  note?: string;
  labs?: LabSpec[];
  diagnosis?: { description: string; plan: string };
  prescriptions?: RxSpec[];
  status: "OPEN" | "CLOSED";
  followUpInDays?: number;
};

type PatientStory = {
  fullName: string;
  dateOfBirth: string;
  sex: "MALE" | "FEMALE";
  phone: string;
  address: string;
  bloodGroup?: string;
  genotype?: "AA" | "AS" | "SS" | "AC" | "SC";
  allergies?: string[];
  cardSeries: "GOP" | "PVT" | "ANC" | "CWC" | "STF";
  nextOfKinName: string;
  nextOfKinPhone: string;
  nextOfKinRelation: string;
  visits: VisitSpec[];
};

const PATIENT_STORIES: PatientStory[] = [
  {
    fullName: "Adebayo Ogundimu",
    dateOfBirth: "1966-03-14",
    sex: "MALE",
    phone: "0803 214 7765",
    address: "14 Allen Avenue, Ikeja, Lagos",
    bloodGroup: "O+",
    genotype: "AA",
    cardSeries: "GOP",
    nextOfKinName: "Yemisi Ogundimu",
    nextOfKinPhone: "0803 214 7766",
    nextOfKinRelation: "Wife",
    visits: [
      {
        monthsAgo: 11,
        presentingComplaint: "Occasional headaches and dizziness for two weeks",
        vitals: { systolicBp: 148, diastolicBp: 94, temperatureC: 36.8, pulseBpm: 82, respiratoryRate: 18, weightKg: 84 },
        note: "Patient reports headaches, no visual changes. Newly elevated BP.",
        diagnosis: { description: "Stage 1 hypertension, newly diagnosed", plan: "Start antihypertensive, lifestyle advice, review in 6 weeks" },
        prescriptions: [{ drugName: "Amlodipine", dosage: "5mg", frequency: "OD", duration: "6 weeks", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 42,
      },
      {
        monthsAgo: 8,
        presentingComplaint: "Follow-up for blood pressure",
        vitals: { systolicBp: 152, diastolicBp: 96, temperatureC: 36.7, pulseBpm: 84, weightKg: 85 },
        note: "BP still elevated on Amlodipine 5mg. Adherence confirmed.",
        diagnosis: { description: "Hypertension, suboptimal control", plan: "Increase Amlodipine to 10mg, add Lisinopril" },
        prescriptions: [
          { drugName: "Amlodipine", dosage: "10mg", frequency: "OD", duration: "8 weeks", dispensed: true },
          { drugName: "Lisinopril", dosage: "10mg", frequency: "OD", duration: "8 weeks", dispensed: true },
        ],
        status: "CLOSED",
        followUpInDays: 56,
      },
      {
        monthsAgo: 5,
        presentingComplaint: "Routine BP review",
        vitals: { systolicBp: 158, diastolicBp: 98, temperatureC: 36.6, pulseBpm: 88, weightKg: 87 },
        labs: [{ testName: "Serum Creatinine", value: 1.1, unit: "mg/dL", low: 0.6, high: 1.3 }],
        note: "BP trending upward despite two agents. Checking renal function.",
        diagnosis: { description: "Hypertension, poorly controlled", plan: "Refer for renal function workup, reinforce salt restriction" },
        status: "CLOSED",
        followUpInDays: 30,
      },
      {
        monthsAgo: 1,
        presentingComplaint: "Worsening headaches, BP still high at home",
        vitals: { systolicBp: 164, diastolicBp: 102, temperatureC: 36.9, pulseBpm: 90, weightKg: 88 },
        note: "Patient admits missing doses. BP trend concerning across last 4 visits.",
        diagnosis: { description: "Hypertension, poorly controlled — likely adherence issue", plan: "Adherence counselling, add Hydrochlorothiazide, review in 2 weeks" },
        prescriptions: [{ drugName: "Hydrochlorothiazide", dosage: "25mg", frequency: "OD", duration: "2 weeks", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 14,
      },
    ],
  },
  {
    fullName: "Amina Bello",
    dateOfBirth: "1979-07-02",
    sex: "FEMALE",
    phone: "0806 552 1190",
    address: "22 Ahmadu Bello Way, Kaduna",
    bloodGroup: "A+",
    genotype: "AA",
    cardSeries: "PVT",
    nextOfKinName: "Ibrahim Bello",
    nextOfKinPhone: "0806 552 1191",
    nextOfKinRelation: "Husband",
    visits: [
      {
        monthsAgo: 10,
        presentingComplaint: "Increased thirst and frequent urination for a month",
        vitals: { systolicBp: 128, diastolicBp: 82, temperatureC: 36.7, pulseBpm: 78, weightKg: 76 },
        labs: [{ testName: "Fasting Blood Glucose", value: 168, unit: "mg/dL", low: 70, high: 100, abnormal: true }],
        diagnosis: { description: "Type 2 diabetes mellitus, newly diagnosed", plan: "Start Metformin, dietary counselling, recheck glucose in 6 weeks" },
        prescriptions: [{ drugName: "Metformin", dosage: "500mg", frequency: "BD", duration: "6 weeks", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 42,
      },
      {
        monthsAgo: 6,
        presentingComplaint: "Follow-up for diabetes",
        vitals: { systolicBp: 130, diastolicBp: 80, temperatureC: 36.6, pulseBpm: 76, weightKg: 74 },
        labs: [{ testName: "Fasting Blood Glucose", value: 142, unit: "mg/dL", low: 70, high: 100, abnormal: true }],
        diagnosis: { description: "Type 2 diabetes, improving control", plan: "Continue Metformin, increase to 1000mg BD" },
        prescriptions: [{ drugName: "Metformin", dosage: "1000mg", frequency: "BD", duration: "3 months", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 90,
      },
      {
        monthsAgo: 2,
        presentingComplaint: "Routine diabetes review, feeling well",
        vitals: { systolicBp: 126, diastolicBp: 78, temperatureC: 36.6, pulseBpm: 74, weightKg: 72 },
        labs: [{ testName: "Fasting Blood Glucose", value: 108, unit: "mg/dL", low: 70, high: 100, abnormal: true }],
        diagnosis: { description: "Type 2 diabetes, well controlled", plan: "Continue current regimen, review in 3 months" },
        status: "CLOSED",
        followUpInDays: 90,
      },
    ],
  },
  {
    fullName: "Chinyere Nwosu",
    dateOfBirth: "1996-11-20",
    sex: "FEMALE",
    phone: "0705 883 2214",
    address: "5 Aba Road, Port Harcourt",
    bloodGroup: "O-",
    genotype: "AS",
    cardSeries: "ANC",
    nextOfKinName: "Chibuzo Nwosu",
    nextOfKinPhone: "0705 883 2215",
    nextOfKinRelation: "Husband",
    visits: [
      {
        monthsAgo: 7,
        presentingComplaint: "First antenatal booking, 10 weeks by LMP",
        vitals: { systolicBp: 112, diastolicBp: 72, temperatureC: 36.6, pulseBpm: 80, weightKg: 61 },
        labs: [
          { testName: "Hemoglobin", value: 12.4, unit: "g/dL", low: 12, high: 16 },
          { testName: "Genotype", qualitative: "AS", abnormal: false },
        ],
        diagnosis: { description: "Booking visit, low-risk pregnancy", plan: "Start folic acid and hematinics, routine antenatal schedule" },
        prescriptions: [
          { drugName: "Folic Acid", dosage: "5mg", frequency: "OD", duration: "3 months", dispensed: true },
          { drugName: "Ferrous Sulfate", dosage: "200mg", frequency: "OD", duration: "3 months", dispensed: true },
        ],
        status: "CLOSED",
        followUpInDays: 28,
      },
      {
        monthsAgo: 4,
        presentingComplaint: "Routine antenatal visit, 22 weeks",
        vitals: { systolicBp: 116, diastolicBp: 74, temperatureC: 36.7, pulseBpm: 82, weightKg: 65 },
        labs: [{ testName: "Hemoglobin", value: 11.8, unit: "g/dL", low: 12, high: 16, abnormal: true }],
        diagnosis: { description: "Mild anaemia of pregnancy", plan: "Increase hematinics, dietary advice, recheck at next visit" },
        status: "CLOSED",
        followUpInDays: 28,
      },
      {
        monthsAgo: 1,
        presentingComplaint: "Routine antenatal visit, 34 weeks",
        vitals: { systolicBp: 118, diastolicBp: 76, temperatureC: 36.6, pulseBpm: 84, weightKg: 69 },
        labs: [{ testName: "Hemoglobin", value: 12.6, unit: "g/dL", low: 12, high: 16 }],
        diagnosis: { description: "Pregnancy progressing normally, 34 weeks", plan: "Continue hematinics, discuss birth plan, review in 2 weeks" },
        status: "CLOSED",
        followUpInDays: 14,
      },
    ],
  },
  {
    fullName: "Ibrahim Sule",
    dateOfBirth: "1990-05-09",
    sex: "MALE",
    phone: "0812 340 5567",
    address: "8 Zaria Road, Kano",
    bloodGroup: "B+",
    genotype: "AA",
    cardSeries: "GOP",
    nextOfKinName: "Hauwa Sule",
    nextOfKinPhone: "0812 340 5568",
    nextOfKinRelation: "Sister",
    visits: [
      {
        monthsAgo: 2,
        presentingComplaint: "Fever, chills, and body aches for 3 days",
        vitals: { systolicBp: 118, diastolicBp: 76, temperatureC: 38.9, pulseBpm: 102, respiratoryRate: 20, weightKg: 70 },
        labs: [{ testName: "Malaria Parasite", qualitative: "Positive (++)", abnormal: true }],
        diagnosis: { description: "Uncomplicated malaria", plan: "Start artemether-lumefantrine, antipyretics, review if not improving in 3 days" },
        prescriptions: [
          { drugName: "Artemether-Lumefantrine", dosage: "80/480mg", frequency: "BD", duration: "3 days", dispensed: true },
          { drugName: "Paracetamol", dosage: "500mg", frequency: "TDS", duration: "3 days", dispensed: true },
        ],
        status: "CLOSED",
        followUpInDays: 5,
      },
    ],
  },
  {
    fullName: "Temitope Alabi",
    dateOfBirth: "2019-09-01",
    sex: "FEMALE",
    phone: "0703 221 8890",
    address: "17 Adeniran Ogunsanya St, Surulere, Lagos",
    genotype: "AA",
    cardSeries: "CWC",
    nextOfKinName: "Kemi Alabi",
    nextOfKinPhone: "0703 221 8890",
    nextOfKinRelation: "Mother",
    visits: [
      {
        monthsAgo: 3,
        presentingComplaint: "Cough and fast breathing for 4 days",
        vitals: { temperatureC: 38.2, pulseBpm: 128, respiratoryRate: 42, weightKg: 14.2 },
        diagnosis: { description: "Acute bronchopneumonia", plan: "Start oral amoxicillin, review in 5 days, return sooner if worsening" },
        prescriptions: [{ drugName: "Amoxicillin", dosage: "250mg/5ml", frequency: "TDS", duration: "5 days", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 5,
      },
      {
        monthsAgo: 3,
        presentingComplaint: "Review after antibiotics",
        vitals: { temperatureC: 36.8, pulseBpm: 100, respiratoryRate: 26, weightKg: 14.4 },
        diagnosis: { description: "Resolved bronchopneumonia", plan: "Complete course, no further antibiotics needed" },
        status: "CLOSED",
      },
    ],
  },
  {
    fullName: "Efe Omoregie",
    dateOfBirth: "1998-01-17",
    sex: "MALE",
    phone: "0813 774 2201",
    address: "3 Sapele Road, Benin City",
    bloodGroup: "O+",
    genotype: "SS",
    allergies: ["Sulfa drugs"],
    cardSeries: "GOP",
    nextOfKinName: "Osaretin Omoregie",
    nextOfKinPhone: "0813 774 2202",
    nextOfKinRelation: "Brother",
    visits: [
      {
        monthsAgo: 9,
        presentingComplaint: "Severe joint and bone pain, known sickle cell disease",
        vitals: { systolicBp: 110, diastolicBp: 70, temperatureC: 37.6, pulseBpm: 108, respiratoryRate: 22, weightKg: 58 },
        labs: [{ testName: "Packed Cell Volume", value: 24, unit: "%", low: 36, high: 48, abnormal: true }],
        diagnosis: { description: "Vaso-occlusive sickle cell crisis", plan: "IV fluids, analgesia, admit for observation" },
        prescriptions: [{ drugName: "Folic Acid", dosage: "5mg", frequency: "OD", duration: "Ongoing", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 30,
      },
      {
        monthsAgo: 5,
        presentingComplaint: "Routine sickle cell clinic review",
        vitals: { systolicBp: 112, diastolicBp: 72, temperatureC: 36.7, pulseBpm: 84, weightKg: 60 },
        labs: [{ testName: "Packed Cell Volume", value: 29, unit: "%", low: 36, high: 48, abnormal: true }],
        diagnosis: { description: "Sickle cell disease, stable interval health", plan: "Continue hydroxyurea and folic acid, routine review in 3 months" },
        prescriptions: [{ drugName: "Hydroxyurea", dosage: "500mg", frequency: "OD", duration: "3 months", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 90,
      },
      {
        monthsAgo: 0.5,
        presentingComplaint: "Mild joint pain, no fever",
        vitals: { systolicBp: 114, diastolicBp: 74, temperatureC: 36.9, pulseBpm: 88, weightKg: 61 },
        diagnosis: { description: "Sickle cell disease, mild pain episode", plan: "Oral analgesia, hydration advice, routine follow-up" },
        status: "CLOSED",
        followUpInDays: 90,
      },
    ],
  },
  {
    fullName: "Grace Okon",
    dateOfBirth: "1957-02-28",
    sex: "FEMALE",
    phone: "0802 119 3345",
    address: "11 Ndidem Usang Iso Road, Calabar",
    bloodGroup: "AB+",
    genotype: "AA",
    cardSeries: "PVT",
    nextOfKinName: "Edet Okon",
    nextOfKinPhone: "0802 119 3346",
    nextOfKinRelation: "Son",
    visits: [
      {
        monthsAgo: 6,
        presentingComplaint: "Routine review, hypertension and diabetes",
        vitals: { systolicBp: 132, diastolicBp: 84, temperatureC: 36.6, pulseBpm: 76, weightKg: 79 },
        labs: [{ testName: "Fasting Blood Glucose", value: 96, unit: "mg/dL", low: 70, high: 100 }],
        diagnosis: { description: "Hypertension and type 2 diabetes, both well controlled", plan: "Continue current medications, routine review in 3 months" },
        prescriptions: [
          { drugName: "Amlodipine", dosage: "5mg", frequency: "OD", duration: "3 months", dispensed: true },
          { drugName: "Metformin", dosage: "500mg", frequency: "BD", duration: "3 months", dispensed: true },
        ],
        status: "CLOSED",
        followUpInDays: 90,
      },
      {
        monthsAgo: 3,
        presentingComplaint: "Routine review",
        vitals: { systolicBp: 128, diastolicBp: 82, temperatureC: 36.6, pulseBpm: 74, weightKg: 78 },
        labs: [{ testName: "Fasting Blood Glucose", value: 92, unit: "mg/dL", low: 70, high: 100 }],
        diagnosis: { description: "Hypertension and type 2 diabetes, stable", plan: "Continue current medications" },
        status: "CLOSED",
        followUpInDays: 90,
      },
    ],
  },
  {
    fullName: "Musa Garba",
    dateOfBirth: "1983-08-12",
    sex: "MALE",
    phone: "0708 556 7712",
    address: "29 Bauchi Road, Jos",
    bloodGroup: "O+",
    genotype: "AA",
    cardSeries: "GOP",
    nextOfKinName: "Zainab Garba",
    nextOfKinPhone: "0708 556 7713",
    nextOfKinRelation: "Wife",
    visits: [
      {
        monthsAgo: 4,
        presentingComplaint: "Fever, headache, and abdominal discomfort for a week",
        vitals: { systolicBp: 116, diastolicBp: 74, temperatureC: 39.1, pulseBpm: 96, weightKg: 72 },
        labs: [{ testName: "Widal Test", qualitative: "Significant titre (≥1:160)", abnormal: true }],
        diagnosis: { description: "Typhoid fever", plan: "Start ciprofloxacin, hydration, review in 1 week" },
        prescriptions: [{ drugName: "Ciprofloxacin", dosage: "500mg", frequency: "BD", duration: "10 days", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 7,
      },
    ],
  },
  {
    fullName: "Blessing Etim",
    dateOfBirth: "1993-04-05",
    sex: "FEMALE",
    phone: "0805 662 9981",
    address: "6 Marina Road, Uyo",
    bloodGroup: "A-",
    genotype: "AA",
    cardSeries: "GOP",
    nextOfKinName: "Emem Etim",
    nextOfKinPhone: "0805 662 9982",
    nextOfKinRelation: "Sister",
    visits: [
      {
        monthsAgo: 1,
        presentingComplaint: "Fell off a motorcycle, right wrist pain and swelling",
        vitals: { systolicBp: 122, diastolicBp: 78, temperatureC: 36.7, pulseBpm: 90, weightKg: 63 },
        diagnosis: { description: "Right wrist sprain, no fracture suspected on exam", plan: "Rest, splint, analgesia, review in 1 week if not improving" },
        prescriptions: [{ drugName: "Ibuprofen", dosage: "400mg", frequency: "TDS", duration: "5 days", dispensed: true }],
        status: "CLOSED",
        followUpInDays: 7,
      },
    ],
  },
  {
    fullName: "Fatima Abdullahi",
    dateOfBirth: "2001-12-30",
    sex: "FEMALE",
    phone: "0816 223 4471",
    address: "2 Yandoto Street, Sokoto",
    bloodGroup: "B-",
    genotype: "AS",
    cardSeries: "PVT",
    nextOfKinName: "Abdullahi Umar",
    nextOfKinPhone: "0816 223 4472",
    nextOfKinRelation: "Father",
    visits: [
      {
        monthsAgo: 0.2,
        presentingComplaint: "General checkup, new patient",
        vitals: { systolicBp: 110, diastolicBp: 70, temperatureC: 36.6, pulseBpm: 72, weightKg: 58 },
        diagnosis: { description: "No acute complaints, healthy young adult", plan: "General health advice, routine bloodwork" },
        labs: [{ testName: "Genotype", qualitative: "AS", abnormal: false }],
        status: "OPEN",
      },
    ],
  },
  {
    fullName: "Oluwaseun Bankole",
    dateOfBirth: "1980-06-18",
    sex: "MALE",
    phone: "0813 990 2245",
    address: "40 Awolowo Road, Ikoyi, Lagos",
    bloodGroup: "O+",
    genotype: "AA",
    cardSeries: "PVT",
    nextOfKinName: "Bimpe Bankole",
    nextOfKinPhone: "0813 990 2246",
    nextOfKinRelation: "Wife",
    visits: [
      {
        monthsAgo: 5,
        presentingComplaint: "Executive health screening",
        vitals: { systolicBp: 124, diastolicBp: 80, temperatureC: 36.7, pulseBpm: 74, weightKg: 91 },
        labs: [
          { testName: "Alanine Aminotransferase (ALT)", value: 62, unit: "U/L", low: 7, high: 56, abnormal: true },
          { testName: "Aspartate Aminotransferase (AST)", value: 48, unit: "U/L", low: 10, high: 40, abnormal: true },
        ],
        diagnosis: { description: "Mildly elevated liver enzymes, likely alcohol-related", plan: "Reduce alcohol intake, recheck LFT in 3 months" },
        status: "CLOSED",
        followUpInDays: 90,
      },
      {
        monthsAgo: 2,
        presentingComplaint: "Follow-up liver function check",
        vitals: { systolicBp: 122, diastolicBp: 78, temperatureC: 36.6, pulseBpm: 72, weightKg: 89 },
        labs: [
          { testName: "Alanine Aminotransferase (ALT)", value: 41, unit: "U/L", low: 7, high: 56 },
          { testName: "Aspartate Aminotransferase (AST)", value: 32, unit: "U/L", low: 10, high: 40 },
        ],
        diagnosis: { description: "Liver enzymes normalised", plan: "Continue lifestyle changes, annual screening" },
        status: "CLOSED",
        followUpInDays: 365,
      },
    ],
  },
];

async function seedPatients(
  cardTypeIds: Record<string, string>,
  departmentIds: Record<string, string>,
  staffIds: Record<string, string>,
  hospitalId: string,
  options: { stories?: PatientStory[]; emailSuffix?: string; identityByName?: Record<string, string> } = {},
) {
  const stories = options.stories ?? PATIENT_STORIES;
  const staff = (base: string) => {
    const id = staffIds[`${base}${options.emailSuffix ?? ""}@carenexa.cloud`];
    if (!id) throw new Error(`Seed staff account missing: ${base}${options.emailSuffix ?? ""}`);
    return id;
  };
  const nurseId = staff("nurse");
  const clinicianIds = [staff("clinician"), staff("consultant")];
  const labId = staff("lab");
  const pharmacistId = staff("pharmacist");
  const createdByName: Record<string, string> = {};

  let count = 0;
  for (const story of stories) {
    const cardTypeId = cardTypeIds[story.cardSeries];
    const hospitalNumber = await issueHospitalNumber(cardTypeId, story.cardSeries);

    const patient = await db.patient.create({
      data: {
        hospitalId,
        fullName: story.fullName,
        dateOfBirth: new Date(story.dateOfBirth),
        sex: story.sex,
        phone: story.phone,
        address: story.address,
        bloodGroup: story.bloodGroup ?? null,
        genotype: story.genotype ?? null,
        allergies: story.allergies ?? [],
        nextOfKinName: story.nextOfKinName,
        nextOfKinPhone: story.nextOfKinPhone,
        nextOfKinRelation: story.nextOfKinRelation,
        cardTypeId,
        hospitalNumber,
        identityLinks: {
          create: {
            hospital: { connect: { id: hospitalId } },
            verificationStatus: "VERIFIED",
            // A story whose patient already holds a CareNexa identity at another
            // hospital links to it: one identity, separate local records.
            identity: options.identityByName?.[story.fullName]
              ? { connect: { id: options.identityByName[story.fullName] } }
              : {
                  create: {
                    universalPatientNumber: `CNX-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
                    verificationStatus: "VERIFIED",
                    verificationMethod: "SYNTHETIC_DEMO",
                    verifiedAt: new Date(),
                  },
                },
          },
        },
      },
    });

    createdByName[story.fullName] = patient.id;
    const identityLink = await db.patientHospitalLink.findFirstOrThrow({ where: { patientId: patient.id, hospitalId } });
    await db.patientIdentityVerification.create({
      data: {
        identityId: identityLink.identityId,
        hospitalId,
        patientId: patient.id,
        verifiedById: staff("records"),
        status: "VERIFIED",
        method: "SYNTHETIC_DEMO",
        evidenceReference: "Synthetic seed identity verification",
      },
    });

    for (let i = 0; i < story.visits.length; i++) {
      const v = story.visits[i];
      const clinicianId = clinicianIds[i % clinicianIds.length];
      const openedAt = new Date(Date.now() - v.monthsAgo * 30 * DAY_MS);

      const visit = await db.visit.create({
        data: {
          hospitalId,
          patientId: patient.id,
          openedAt,
          openedById: staff("reception"),
          status: v.status,
          presentingComplaint: v.presentingComplaint,
          closedAt: v.status === "CLOSED" ? new Date(openedAt.getTime() + 2 * 60 * 60 * 1000) : null,
          followUpDate: v.followUpInDays ? new Date(openedAt.getTime() + v.followUpInDays * DAY_MS) : null,
        },
      });

      if (v.vitals) {
        await db.vitalsRecord.create({
          data: { visitId: visit.id, recordedById: nurseId, recordedAt: openedAt, ...v.vitals },
        });

        await db.request.create({
          data: {
            hospitalId,
            visitId: visit.id,
            fromDepartmentId: departmentIds.nursing,
            toDepartmentId: departmentIds.clinician,
            requestedById: nurseId,
            fulfilledById: clinicianId,
            requestType: "Clinical Review",
            reason: v.presentingComplaint,
            status: "COMPLETED",
            outcomeSummary: v.diagnosis?.description ?? "Reviewed",
            createdAt: openedAt,
            completedAt: openedAt,
          },
        });
      }

      if (v.note) {
        await db.clinicalNote.create({
          data: { visitId: visit.id, authorId: clinicianId, content: v.note, createdAt: openedAt, signedAt: openedAt },
        });
      }

      if (v.diagnosis) {
        await db.diagnosis.create({
          data: { visitId: visit.id, recordedById: clinicianId, createdAt: openedAt, ...v.diagnosis },
        });
      }

      if (v.labs?.length) {
        const labRequest = await db.request.create({
          data: {
            hospitalId,
            visitId: visit.id,
            fromDepartmentId: departmentIds.clinician,
            toDepartmentId: departmentIds.lab,
            requestedById: clinicianId,
            fulfilledById: labId,
            requestType: v.labs[0].testName,
            reason: `Investigate: ${v.presentingComplaint}`,
            status: "COMPLETED",
            outcomeSummary: v.labs.map((l) => l.qualitative ?? `${l.value}${l.unit}`).join(", "),
            createdAt: openedAt,
            completedAt: openedAt,
          },
        });

        for (const l of v.labs) {
          await db.labResult.create({
            data: {
              visitId: visit.id,
              requestId: labRequest.id,
              enteredById: labId,
              enteredAt: openedAt,
              testName: l.testName,
              resultType: l.qualitative ? "QUALITATIVE" : "NUMERIC",
              value: l.qualitative ? null : l.value,
              qualitativeValue: l.qualitative ?? null,
              unit: l.unit ?? "",
              referenceLow: l.low ?? null,
              referenceHigh: l.high ?? null,
              isAbnormal: Boolean(l.abnormal),
            },
          });
        }
      }

      if (v.prescriptions?.length) {
        await db.request.create({
          data: {
            hospitalId,
            visitId: visit.id,
            fromDepartmentId: departmentIds.clinician,
            toDepartmentId: departmentIds.pharmacy,
            requestedById: clinicianId,
            fulfilledById: pharmacistId,
            requestType: "Dispense Prescription",
            reason: "Prescribed medication",
            status: "COMPLETED",
            outcomeSummary: v.prescriptions.map((p) => p.drugName).join(", "),
            createdAt: openedAt,
            completedAt: openedAt,
          },
        });

        for (const p of v.prescriptions) {
          const prescription = await db.prescription.create({
            data: {
              visitId: visit.id,
              prescribedById: clinicianId,
              createdAt: openedAt,
              drugName: p.drugName,
              dosage: p.dosage,
              frequency: p.frequency,
              duration: p.duration,
              status: p.dispensed ? "DISPENSED" : "PENDING",
            },
          });

          if (p.dispensed) {
            await db.dispensation.create({
              data: { prescriptionId: prescription.id, dispensedById: pharmacistId, dispensedAt: openedAt, quantity: "As prescribed" },
            });
          }
        }
      }
    }

    count++;
  }

  console.log(`Seeded ${count} patients with ${stories.reduce((s, p) => s + p.visits.length, 0)} visits of history.`);
  return createdByName;
}

// ---------------------------------------------------------------------------
// Recruitment — vacancies with varied, rankable applications.
// ---------------------------------------------------------------------------

async function seedRecruitment(departmentIds: Record<string, string>, hospitalId: string) {
  const vacancies = [
    {
      title: "Medical Officer",
      departmentSlug: "clinician",
      description: "Provide general outpatient consultation, examination, and treatment under consultant supervision.",
      requirements: [
        "MBBS from a recognised institution",
        "Valid MDCN licence to practise",
        "Completed NYSC",
        "At least 1 year post-NYSC clinical experience",
      ],
      employmentType: "Full-time",
      location: "Ikeja, Lagos",
      applications: [
        {
          fullName: "Dr. Tunde Fagbenle",
          email: "tunde.fagbenle@example.com",
          phone: "0803 555 0101",
          cvText:
            "MBBS, University of Lagos (2018). NYSC completed 2019 at General Hospital Minna. MDCN licence current. 3 years as Medical Officer at Reddington Hospital, Lagos, managing general outpatient caseload and minor procedures. Certificate in Basic Life Support.",
        },
        {
          fullName: "Dr. Chiamaka Uzoh",
          email: "chiamaka.uzoh@example.com",
          phone: "0805 555 0102",
          cvText:
            "MBBS, University of Nigeria Nsukka (2021). NYSC completed 2022. MDCN licence current. 6 months locum experience at a primary health centre in Enugu. Seeking first substantive role. Strong academic record, no post-NYSC hospital employment yet.",
        },
        {
          fullName: "Dr. Bashir Yola",
          email: "bashir.yola@example.com",
          phone: "0807 555 0103",
          cvText:
            "MBBS, Ahmadu Bello University (2015). MDCN licence current but lapsed renewal for 8 months, since renewed. 5 years experience, most recently 2 years as Medical Officer at a private hospital in Kaduna, handling outpatient and minor emergency cases.",
        },
        {
          fullName: "Dr. Ifeoma Okpara",
          email: "ifeoma.okpara@example.com",
          phone: "0809 555 0104",
          cvText:
            "MBBS, University of Ibadan (2019). NYSC completed 2020. MDCN licence current. 2.5 years as Medical Officer, Federal Medical Centre Owerri, general outpatient and antenatal clinic support. Diploma in Family Medicine (ongoing).",
        },
      ],
    },
    {
      title: "Nursing Officer",
      departmentSlug: "nursing",
      description: "Provide direct nursing care, vitals monitoring, and ward support across departments.",
      requirements: [
        "RN qualification from an accredited nursing school",
        "Valid Nursing and Midwifery Council of Nigeria (NMCN) licence",
        "At least 2 years post-qualification experience",
        "Experience with electronic patient records is an advantage",
      ],
      employmentType: "Full-time",
      location: "Ikeja, Lagos",
      applications: [
        {
          fullName: "Chidera Nwankwo",
          email: "chidera.nwankwo@example.com",
          phone: "0813 555 0201",
          cvText:
            "RN, School of Nursing Lagos University Teaching Hospital (2017). NMCN licence current. 5 years nursing experience across general wards and outpatient triage at LUTH. Comfortable with electronic patient record systems.",
        },
        {
          fullName: "Halima Yusuf",
          email: "halima.yusuf@example.com",
          phone: "0816 555 0202",
          cvText:
            "RN, School of Nursing Kano (2020). NMCN licence current. 1.5 years experience at a state hospital, mostly paediatric ward. Below the 2-year requirement but strong references.",
        },
        {
          fullName: "Patience Ebong",
          email: "patience.ebong@example.com",
          phone: "0817 555 0203",
          cvText:
            "RN and RM, School of Nursing Calabar (2014). NMCN licence current. 9 years experience spanning general nursing, antenatal, and ward management. Currently a Nursing Officer II at a private hospital in Calabar.",
        },
      ],
    },
    {
      title: "Laboratory Scientist",
      departmentSlug: "lab",
      description: "Run diagnostic tests, maintain lab equipment, and report results accurately and on time.",
      requirements: [
        "B.MLS or equivalent degree in Medical Laboratory Science",
        "Valid MLSCN licence",
        "Experience with haematology and clinical chemistry testing",
      ],
      employmentType: "Full-time",
      location: "Ikeja, Lagos",
      applications: [
        {
          fullName: "Emmanuel Okoro",
          email: "emmanuel.okoro@example.com",
          phone: "0818 555 0301",
          cvText:
            "B.MLS, University of Nigeria Nsukka (2019). MLSCN licence current. 3 years as Laboratory Scientist II at a diagnostic centre, running haematology, clinical chemistry, and microbiology panels daily.",
        },
        {
          fullName: "Rasheedat Alao",
          email: "rasheedat.alao@example.com",
          phone: "0819 555 0302",
          cvText:
            "AIMLS (Associate) certification, no full B.MLS degree yet. 4 years as a laboratory technician assisting scientists with sample processing. Does not hold MLSCN scientist licence — would need certification support.",
        },
      ],
    },
  ];

  for (const vacancy of vacancies) {
    // Match an existing vacancy by hospital + title first: rows seeded before the
    // multi-hospital change use the older "seed-<title>" ID format.
    const existingVacancy = await db.vacancy.findFirst({ where: { hospitalId, title: vacancy.title }, orderBy: { createdAt: "asc" } });
    const created = existingVacancy ?? await db.vacancy.upsert({
      where: { id: `seed-${hospitalId}-${vacancy.title.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: {
        id: `seed-${hospitalId}-${vacancy.title.toLowerCase().replace(/\s+/g, "-")}`,
        hospitalId,
        title: vacancy.title,
        departmentId: departmentIds[vacancy.departmentSlug],
        description: vacancy.description,
        requirements: vacancy.requirements,
        employmentType: vacancy.employmentType,
        location: vacancy.location,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - 20 * DAY_MS),
      },
    });

    for (const app of vacancy.applications) {
      const existingCandidate = await db.candidate.findFirst({ where: { hospitalId, email: app.email } });
      const candidate = existingCandidate ?? (await db.candidate.create({ data: { hospitalId, fullName: app.fullName, email: app.email, phone: app.phone } }));

      const existingApplication = await db.application.findFirst({ where: { hospitalId, vacancyId: created.id, candidateId: candidate.id } });
      if (!existingApplication) {
        await db.application.create({ data: { hospitalId, vacancyId: created.id, candidateId: candidate.id, cvText: app.cvText } });
      }
    }
  }

  console.log(`Seeded ${vacancies.length} vacancies with ${vacancies.reduce((s, v) => s + v.applications.length, 0)} applications.`);
}


// ---------------------------------------------------------------------------
// Specialist Hospital (Hospital B) — synthetic demo data.
// ---------------------------------------------------------------------------

const SPECIALIST_STAFF: Record<string, StaffOverride> = {
  "admin@carenexa.cloud": { fullName: "Kemi Adeyemi", jobTitle: "Hospital Administrator" },
  "records@carenexa.cloud": { fullName: "Ifeoma Nnaji", jobTitle: "Health Records Officer" },
  "reception@carenexa.cloud": { fullName: "Sade Lawal", jobTitle: "Referral Desk Receptionist" },
  "nurse@carenexa.cloud": { fullName: "Rukayat Sule", jobTitle: "Cardiac Nurse" },
  "matron@carenexa.cloud": { fullName: "Esther Danjuma", jobTitle: "Matron" },
  "clinician@carenexa.cloud": { fullName: "Dr. Olumide Bankole", jobTitle: "Consultant Cardiologist" },
  "consultant@carenexa.cloud": { fullName: "Dr. Zainab Abubakar", jobTitle: "Consultant Haematologist" },
  "lab@carenexa.cloud": { fullName: "Kelechi Uzor", jobTitle: "Medical Laboratory Scientist" },
  "pharmacist@carenexa.cloud": { fullName: "Bola Akande", jobTitle: "Clinical Pharmacist" },
  "recruiter@carenexa.cloud": { fullName: "Hadiza Yusuf", jobTitle: "HR / Recruitment Officer" },
};

const SPECIALIST_DEPARTMENTS: DepartmentSeed[] = [
  {
    name: "Cardiology",
    slug: "cardiology",
    description: "Specialist cardiovascular assessment, echocardiography and hypertension clinic.",
    acceptsRequestTypes: ["Cardiology Review", "Echocardiogram"],
    resultFields: { fields: [{ name: "note", label: "Cardiology note", type: "text" }] },
  },
  {
    name: "Haematology",
    slug: "haematology",
    description: "Sickle cell, anaemia and blood disorder specialist clinic.",
    acceptsRequestTypes: ["Haematology Review"],
    resultFields: { fields: [{ name: "note", label: "Haematology note", type: "text" }] },
  },
];

// The shared patient keeps the same demographics as their General Hospital
// record (same person), with a separate Specialist Hospital clinical history.
function sharedSpecialistStory(name: string, visits: VisitSpec[]): PatientStory {
  const base = PATIENT_STORIES.find((story) => story.fullName === name);
  if (!base) throw new Error(`Shared demo patient ${name} missing from General Hospital stories`);
  return { ...base, cardSeries: "GOP", visits };
}

const SHARED_PATIENT = "Adebayo Ogundimu";

function specialistStories(): PatientStory[] {
  return [
    sharedSpecialistStory(SHARED_PATIENT, [
      {
        monthsAgo: 4.7,
        presentingComplaint: "Cardiology review on referral: hypertension poorly controlled on two agents",
        vitals: { systolicBp: 158, diastolicBp: 98, temperatureC: 36.6, pulseBpm: 80, respiratoryRate: 16, weightKg: 85 },
        labs: [
          { testName: "LDL Cholesterol", value: 172, unit: "mg/dL", low: 0, high: 130, abnormal: true },
          { testName: "Serum Creatinine", value: 1.2, unit: "mg/dL", low: 0.6, high: 1.3 },
          { testName: "ECG", qualitative: "Left ventricular hypertrophy by voltage criteria", abnormal: true },
        ],
        note: "Referred from General Hospital GOPD. Echo: concentric LVH, EF 58%. Renal function preserved. Discussed adherence and salt intake.",
        diagnosis: { description: "Hypertensive heart disease with left ventricular hypertrophy", plan: "Optimise antihypertensives, start statin, return to GOPD with counter-referral; cardiology review in 6 months" },
        prescriptions: [
          { drugName: "Lisinopril", dosage: "20mg", frequency: "OD", duration: "3 months", dispensed: true },
          { drugName: "Atorvastatin", dosage: "20mg", frequency: "Nocte", duration: "3 months", dispensed: true },
        ],
        status: "CLOSED",
        followUpInDays: 180,
      },
    ]),
    {
      fullName: "Hauwa Musa",
      dateOfBirth: "1979-07-22",
      sex: "FEMALE",
      phone: "0806 551 2093",
      address: "3 Ahmadu Bello Way, Kaduna",
      bloodGroup: "A+",
      genotype: "AA",
      allergies: ["Sulfa drugs"],
      cardSeries: "PVT",
      nextOfKinName: "Ibrahim Musa",
      nextOfKinPhone: "0806 551 2094",
      nextOfKinRelation: "Husband",
      visits: [
        {
          monthsAgo: 6,
          presentingComplaint: "Breathlessness on exertion and ankle swelling",
          vitals: { systolicBp: 132, diastolicBp: 84, temperatureC: 36.7, pulseBpm: 96, respiratoryRate: 22, weightKg: 78 },
          labs: [{ testName: "NT-proBNP", value: 1450, unit: "pg/mL", low: 0, high: 125, abnormal: true }],
          note: "Bibasal crackles, pitting oedema to mid-shin. Echo: EF 35%.",
          diagnosis: { description: "Heart failure with reduced ejection fraction", plan: "Start diuretic and ACE inhibitor, fluid restriction, review in 6 weeks" },
          prescriptions: [{ drugName: "Furosemide", dosage: "40mg", frequency: "OD", duration: "6 weeks", dispensed: true }],
          status: "CLOSED",
          followUpInDays: 42,
        },
        {
          monthsAgo: 4.5,
          presentingComplaint: "Heart failure clinic follow-up",
          vitals: { systolicBp: 124, diastolicBp: 78, temperatureC: 36.5, pulseBpm: 82, respiratoryRate: 18, weightKg: 74 },
          labs: [{ testName: "NT-proBNP", value: 640, unit: "pg/mL", low: 0, high: 125, abnormal: true }],
          note: "Improved exercise tolerance, oedema resolved. Weight down 4kg.",
          diagnosis: { description: "Heart failure with reduced ejection fraction, improving", plan: "Continue therapy, repeat echo in 3 months" },
          status: "CLOSED",
          followUpInDays: 90,
        },
      ],
    },
    {
      fullName: "Chukwudi Eze",
      dateOfBirth: "1998-11-02",
      sex: "MALE",
      phone: "0809 330 4471",
      address: "21 Ogui Road, Enugu",
      bloodGroup: "B+",
      genotype: "SS",
      cardSeries: "GOP",
      nextOfKinName: "Ngozi Eze",
      nextOfKinPhone: "0809 330 4472",
      nextOfKinRelation: "Mother",
      visits: [
        {
          monthsAgo: 3,
          presentingComplaint: "Haematology clinic review, two crises in the last quarter",
          vitals: { systolicBp: 112, diastolicBp: 70, temperatureC: 36.9, pulseBpm: 88, respiratoryRate: 18, weightKg: 61 },
          labs: [
            { testName: "Haemoglobin", value: 7.4, unit: "g/dL", low: 13, high: 17, abnormal: true },
            { testName: "Fetal Haemoglobin (HbF)", value: 6, unit: "%", low: 0, high: 2, abnormal: true },
          ],
          note: "Adherent to folic acid. Discussed hydroxyurea; patient agreed.",
          diagnosis: { description: "Sickle cell anaemia with recurrent vaso-occlusive crises", plan: "Start hydroxyurea, FBC monitoring every 4 weeks" },
          prescriptions: [{ drugName: "Hydroxyurea", dosage: "500mg", frequency: "OD", duration: "3 months", dispensed: true }],
          status: "CLOSED",
          followUpInDays: 28,
        },
        {
          monthsAgo: 1,
          presentingComplaint: "Hydroxyurea monitoring visit",
          labs: [{ testName: "Haemoglobin", value: 8.1, unit: "g/dL", low: 13, high: 17, abnormal: true }],
          note: "No crises since starting hydroxyurea. Mild improvement in Hb.",
          diagnosis: { description: "Sickle cell anaemia, responding to hydroxyurea", plan: "Continue current dose, review in 8 weeks" },
          status: "CLOSED",
          followUpInDays: 56,
        },
      ],
    },
  ];
}

// Historical referrals with timestamped events, so the pilot metrics on /admin
// are computed from persisted events rather than showing empty values.
// Grants are created already expired: historical sharing, not current access.
async function seedReferralHistory(input: {
  hospitalAId: string;
  hospitalBId: string;
  staffA: Record<string, string>;
  staffB: Record<string, string>;
  departmentsB: Record<string, string>;
  departmentsA: Record<string, string>;
}) {
  const existing = await db.referral.count({
    where: { sourceHospitalId: input.hospitalAId, destinationHospitalId: input.hospitalBId },
  });
  if (existing > 0) {
    console.log(`Skipping referral history — ${existing} referrals already exist.`);
    return;
  }

  const minutes = (n: number) => n * 60 * 1000;
  const days = (n: number) => n * DAY_MS;
  const clinicianA = input.staffA["clinician@carenexa.cloud"];
  const cardiologist = input.staffB["clinician-specialist@carenexa.cloud"];
  const haematologist = input.staffB["consultant-specialist@carenexa.cloud"];
  const receptionB = input.staffB["reception-specialist@carenexa.cloud"];

  type EventSpec = { status: Parameters<typeof db.referralEvent.create>[0]["data"]["status"]; at: number; actorId: string; detail?: string };

  async function createHistoricalReferral(spec: {
    patientName: string;
    requestedService: string;
    reason: string;
    urgency: "ROUTINE" | "URGENT";
    destinationDepartmentId: string;
    startDaysAgo: number;
    finalStatus: EventSpec["status"];
    categories: string[];
    events: EventSpec[];
    appointmentAt?: number;
    counterReferral?: { summary: string; at: number };
  }) {
    const patient = await db.patient.findFirst({ where: { hospitalId: input.hospitalAId, fullName: spec.patientName } });
    const link = patient && await db.patientHospitalLink.findFirst({ where: { patientId: patient.id, hospitalId: input.hospitalAId } });
    if (!patient || !link) {
      console.log(`Skipping historical referral for ${spec.patientName} — patient not found at General Hospital.`);
      return;
    }
    const start = Date.now() - days(spec.startDaysAgo);
    const sourceVisit = await db.visit.findFirst({
      where: { patientId: patient.id, hospitalId: input.hospitalAId, openedAt: { lte: new Date(start) } },
      orderBy: { openedAt: "desc" },
    });

    const referral = await db.referral.create({
      data: {
        identityId: link.identityId,
        patientId: patient.id,
        sourceVisitId: sourceVisit?.id ?? null,
        sourceHospitalId: input.hospitalAId,
        destinationHospitalId: input.hospitalBId,
        sourceDepartmentId: input.departmentsA.clinician,
        destinationDepartmentId: spec.destinationDepartmentId,
        referringStaffId: clinicianA,
        reason: spec.reason,
        urgency: spec.urgency,
        requestedService: spec.requestedService,
        clinicalInformation: spec.counterReferral
          ? { synthetic: true, counterReferral: { summary: spec.counterReferral.summary, createdAt: new Date(start + spec.counterReferral.at).toISOString() } }
          : { synthetic: true },
        status: spec.finalStatus,
        appointmentScheduledFor: spec.appointmentAt ? new Date(start + spec.appointmentAt) : null,
        createdAt: new Date(start - minutes(20)),
        submittedAt: new Date(start),
      },
    });

    await db.referralEvent.create({ data: { referralId: referral.id, actorId: clinicianA, status: "DRAFT", detail: "Referral draft created.", createdAt: new Date(start - minutes(20)) } });
    for (const event of spec.events) {
      await db.referralEvent.create({
        data: { referralId: referral.id, actorId: event.actorId, status: event.status, detail: event.detail ?? null, createdAt: new Date(start + event.at) },
      });
    }

    await db.patientAccessGrant.create({
      data: {
        identityId: link.identityId,
        sourceHospitalId: input.hospitalAId,
        receivingHospitalId: input.hospitalBId,
        requestingStaffId: clinicianA,
        purpose: `Referral ${referral.id}: ${spec.requestedService}`,
        recordCategories: spec.categories,
        status: "ACTIVE",
        authorizationEvidence: "Synthetic demo consent",
        authorizedAt: new Date(start),
        expiresAt: new Date(start + days(7)),
        referralId: referral.id,
        createdAt: new Date(start),
      },
    });
    if (spec.counterReferral) {
      await db.patientAccessGrant.create({
        data: {
          identityId: link.identityId,
          sourceHospitalId: input.hospitalBId,
          receivingHospitalId: input.hospitalAId,
          requestingStaffId: cardiologist,
          purpose: `Counter-referral ${referral.id}`,
          recordCategories: ["COUNTER_REFERRAL"],
          status: "ACTIVE",
          authorizationEvidence: "Synthetic demo consent",
          authorizedAt: new Date(start + spec.counterReferral.at),
          expiresAt: new Date(start + spec.counterReferral.at + days(7)),
          referralId: referral.id,
          createdAt: new Date(start + spec.counterReferral.at),
        },
      });
    }
  }

  // 1. Full lifecycle, completed with a returned discharge summary.
  await createHistoricalReferral({
    patientName: SHARED_PATIENT,
    requestedService: "Cardiology assessment",
    reason: "Hypertension poorly controlled on amlodipine and lisinopril; headaches. Please assess for end-organ damage.",
    urgency: "ROUTINE",
    destinationDepartmentId: input.departmentsB.cardiology,
    startDaysAgo: 150,
    finalStatus: "COMPLETED",
    categories: ["DEMOGRAPHICS", "VISITS", "VITALS", "LAB_RESULTS", "DIAGNOSES", "PRESCRIPTIONS"],
    appointmentAt: days(9),
    events: [
      { status: "SUBMITTED", at: 0, actorId: clinicianA, detail: "Patient authorization recorded; referral submitted." },
      { status: "ACKNOWLEDGED", at: minutes(42), actorId: receptionB },
      { status: "UNDER_REVIEW", at: minutes(150), actorId: cardiologist },
      { status: "ACCEPTED", at: days(1), actorId: cardiologist },
      { status: "APPOINTMENT_SCHEDULED", at: days(1) + minutes(10), actorId: receptionB },
      { status: "ARRIVAL_CONFIRMED", at: days(9), actorId: receptionB, detail: "Identity verified in person at Specialist Hospital." },
      { status: "TREATMENT_IN_PROGRESS", at: days(9) + minutes(30), actorId: cardiologist },
      { status: "DISCHARGED", at: days(9) + minutes(240), actorId: cardiologist },
      { status: "COUNTER_REFERRAL_SUBMITTED", at: days(10), actorId: cardiologist, detail: "Patient-authorized counter-referral summary submitted." },
      { status: "COMPLETED", at: days(12), actorId: cardiologist },
    ],
    counterReferral: {
      at: days(10),
      summary: "Seen in cardiology clinic. Echo: concentric LVH, EF 58%. Renal function preserved. Diagnosis: hypertensive heart disease with LVH. Lisinopril increased to 20mg OD; atorvastatin 20mg nocte started. Please continue BP monitoring at GOPD, reinforce adherence. Cardiology review in 6 months.",
    },
  });

  // 2. Needed more information, accepted, but the patient has not yet arrived.
  await createHistoricalReferral({
    patientName: "Efe Omoregie",
    requestedService: "Haematology review",
    reason: "Sickle cell disease (SS) with two crises in nine months. Please review for disease-modifying therapy.",
    urgency: "URGENT",
    destinationDepartmentId: input.departmentsB.haematology,
    startDaysAgo: 60,
    finalStatus: "APPOINTMENT_SCHEDULED",
    categories: ["DEMOGRAPHICS", "DIAGNOSES", "PRESCRIPTIONS"],
    appointmentAt: days(18),
    events: [
      { status: "SUBMITTED", at: 0, actorId: clinicianA, detail: "Patient authorization recorded; referral submitted." },
      { status: "ACKNOWLEDGED", at: minutes(185), actorId: receptionB },
      { status: "MORE_INFORMATION_REQUESTED", at: minutes(320), actorId: haematologist, detail: "Please share recent full blood count and current hydroxyurea dose, if any." },
      { status: "SUBMITTED", at: days(1), actorId: clinicianA, detail: "FBC from last clinic visit added." },
      { status: "ACCEPTED", at: days(1) + minutes(90), actorId: haematologist },
      { status: "APPOINTMENT_SCHEDULED", at: days(1) + minutes(100), actorId: receptionB },
    ],
  });

  console.log("Seeded 2 historical referrals for pilot metrics.");
}

async function main() {
  const hospitalA = await db.hospital.upsert({
    where: { slug: "general-hospital" },
    update: { name: "General Hospital", isActive: true },
    create: { name: "General Hospital", slug: "general-hospital" },
  });
  const hospitalB = await db.hospital.upsert({
    where: { slug: "specialist-hospital" },
    update: { name: "Specialist Hospital", isActive: true },
    create: { name: "Specialist Hospital", slug: "specialist-hospital" },
  });

  const cardTypeIds = await seedCardTypes(hospitalA.id);
  const departmentIds = await seedDepartments(hospitalA.id);
  const staffIds = await seedStaff(departmentIds, hospitalA.id);

  const existingPatients = await db.patient.count({ where: { hospitalId: hospitalA.id } });
  if (existingPatients === 0) {
    await seedPatients(cardTypeIds, departmentIds, staffIds, hospitalA.id);
  } else {
    console.log(`Skipping patient seed — ${existingPatients} patients already exist.`);
  }

  await seedRecruitment(departmentIds, hospitalA.id);

  const cardTypeIdsB = await seedCardTypes(hospitalB.id);
  const departmentIdsB = await seedDepartments(hospitalB.id, SPECIALIST_DEPARTMENTS);
  const staffIdsB = await seedStaff(departmentIdsB, hospitalB.id, "-specialist", SPECIALIST_STAFF);
  await seedRecruitment(departmentIdsB, hospitalB.id);

  const existingPatientsB = await db.patient.count({ where: { hospitalId: hospitalB.id } });
  if (existingPatientsB === 0) {
    // Link Hospital B's record for the shared patient to the identity they
    // already hold at General Hospital: one person, two local records.
    const sharedAtA = await db.patient.findFirst({ where: { hospitalId: hospitalA.id, fullName: SHARED_PATIENT } });
    const sharedLink = sharedAtA && await db.patientHospitalLink.findFirst({ where: { patientId: sharedAtA.id, hospitalId: hospitalA.id } });
    if (!sharedLink) console.log(`${SHARED_PATIENT} not found at General Hospital — Specialist Hospital record will get its own identity.`);
    await seedPatients(cardTypeIdsB, departmentIdsB, staffIdsB, hospitalB.id, {
      stories: specialistStories(),
      emailSuffix: "-specialist",
      identityByName: sharedLink ? { [SHARED_PATIENT]: sharedLink.identityId } : {},
    });
  } else {
    console.log(`Skipping Specialist Hospital patient seed — ${existingPatientsB} patients already exist.`);
  }

  await seedReferralHistory({
    hospitalAId: hospitalA.id,
    hospitalBId: hospitalB.id,
    staffA: staffIds,
    staffB: staffIdsB,
    departmentsA: departmentIds,
    departmentsB: departmentIdsB,
  });

  const platformPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await db.staffMember.upsert({
    where: { email: "platform-admin@carenexa.cloud" },
    update: { isPlatformAdmin: true, hospitalId: null, departmentId: null },
    create: {
      fullName: "CareNexa Platform Administrator",
      email: "platform-admin@carenexa.cloud",
      passwordHash: platformPasswordHash,
      role: "ADMIN",
      jobTitle: "Platform Administrator",
      isPlatformAdmin: true,
    },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
