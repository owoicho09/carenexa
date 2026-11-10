# CareNexa demo login credentials

All patient data is synthetic.

## Master demo login (use this for the presentation)

| Email | Password |
|---|---|
| `platform-admin@carenexa.cloud` | `carenexa2026` |

One account for everything: it can act at both hospitals. Use the coloured **hospital toggle** in the header to switch between General Hospital (blue) and Specialist Hospital (violet). It signs in straight to the **Guide** (`/guide`), which walks through the referral demo step by step and ticks off each step as you go.

With `DEMO_MODE="true"` in the environment, the login page shows these credentials and a **Sign in with demo account** button. Leave `DEMO_MODE` unset anywhere real data is used.

## Individual staff accounts (optional)

Every seeded staff account shares the same password: `carenexa2026`. Each is limited to its own hospital.

## General Hospital (Hospital A)

| Name | Email | Role | Department |
|---|---|---|---|
| Ngozi Adebayo | admin@carenexa.cloud | Administrator | Administration |
| Chidinma Okafor | records@carenexa.cloud | Records Officer | Front Desk / Records |
| Blessing Eze | reception@carenexa.cloud | Receptionist | Front Desk / Records |
| Grace Okonkwo | nurse@carenexa.cloud | Nurse | Nursing |
| Folake Bello | matron@carenexa.cloud | Nurse (Matron) | Nursing |
| Dr. Emeka Nwosu | clinician@carenexa.cloud | Clinician | Outpatient / Clinician |
| Dr. Aisha Bello | consultant@carenexa.cloud | Clinician (Consultant) | Outpatient / Clinician |
| Tunde Fashola | lab@carenexa.cloud | Lab Scientist | Laboratory |
| Chukwuemeka Obi | pharmacist@carenexa.cloud | Pharmacist | Pharmacy |
| Yetunde Balogun | recruiter@carenexa.cloud | Recruiter | Recruitment |

## Specialist Hospital (Hospital B)

| Name | Email | Role | Job title |
|---|---|---|---|
| Kemi Adeyemi | admin-specialist@carenexa.cloud | Administrator | Hospital Administrator |
| Ifeoma Nnaji | records-specialist@carenexa.cloud | Records Officer | Health Records Officer |
| Sade Lawal | reception-specialist@carenexa.cloud | Receptionist | Referral Desk Receptionist |
| Rukayat Sule | nurse-specialist@carenexa.cloud | Nurse | Cardiac Nurse |
| Esther Danjuma | matron-specialist@carenexa.cloud | Nurse (Matron) | Matron |
| Dr. Olumide Bankole | clinician-specialist@carenexa.cloud | Clinician | Consultant Cardiologist |
| Dr. Zainab Abubakar | consultant-specialist@carenexa.cloud | Clinician | Consultant Haematologist |
| Kelechi Uzor | lab-specialist@carenexa.cloud | Lab Scientist | Medical Laboratory Scientist |
| Bola Akande | pharmacist-specialist@carenexa.cloud | Pharmacist | Clinical Pharmacist |
| Hadiza Yusuf | recruiter-specialist@carenexa.cloud | Recruiter | HR / Recruitment Officer |

## Platform

| Account | Email | Access |
|---|---|---|
| Platform Administrator | platform-admin@carenexa.cloud | Can switch between General Hospital and Specialist Hospital |

Hospital administrators are scoped to their own hospital. Only the Platform Administrator can switch hospital workspaces.

## Demo data

- **Adebayo Ogundimu** is the shared synthetic patient: one CareNexa ID, with a separate local record at each hospital (hypertension history at General Hospital; cardiology work-up at Specialist Hospital).
- Specialist Hospital also has two local-only patients: **Hauwa Musa** (heart failure) and **Chukwudi Eze** (sickle cell anaemia).
- Two historical referrals (General → Specialist) feed the pilot metrics on `/admin`: one completed with a returned counter-referral, and one accepted but awaiting arrival after a request for more information. Their access grants have expired.
- On a database that existed before the multi-hospital migration, General Hospital patients start as **verification pending**. Verifying the patient in person is the first step of the walkthrough.

## Walkthrough

Follow the in-app **Guide** (`/guide`) — it lists each step, which hospital to be in, a one-click switch button and a link to the right page. In short, signed in as the master account:

1. **General Hospital** — open Amina Bello, verify identity, refer her to Specialist Hospital, record consent and send.
2. **Specialist Hospital** — open the new referral, register her at this hospital, accept, confirm checked in.
3. **General Hospital** — the referral tracker shows she has checked in.
4. **Specialist Hospital** — start treatment, discharge, send the care report.
5. **General Hospital** — review the report and store it on her record.

Adebayo Ogundimu already has records at both hospitals and a completed referral in his history.
