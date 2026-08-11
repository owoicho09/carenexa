# CareNexa — Build Brief

You are building CareNexa end to end. Read this whole brief before writing anything. It describes what the system *is* and what "finished" means. How you get there is your call — architecture, file structure, libraries, and build order are yours to decide. Where this brief is silent, use judgement and keep moving; where it is specific, treat it as fixed.

---

## The mission

A private hospital in Nigeria runs on this system. One permanent medical record per patient, every department connected so information moves between them instantly, and a recruitment system that hires the staff who work inside it.

This is a **demonstration build for a single hospital** — not a SaaS product, not multi-tenant. It runs on realistic simulated data. But it must not look or feel like a prototype. Every screen a person can reach should be finished, populated, and behave like production software. The demo path must be genuinely functional end to end; the surrounding surface must be complete enough that clicking around never exposes a dead end, a lorem ipsum, or an empty table.

The person seeing this should believe the hospital is already running on it.

---

## What the system holds

Think in these concepts. Model them however you think best.

**Patient** — registered once, exists forever. Identity, demographics, next of kin, blood group, genotype, allergies. At registration the patient selects a **card type** (general outpatient, private, antenatal, child welfare, staff) and the system issues a hospital number from that card's series — `GOP/2026/00412`. Findable instantly by name, phone, or hospital number.

**Visit** — a patient's presence in the hospital on a given day. Everything that happens attaches to it: vitals, notes, requests, results, prescriptions. Opens on arrival, closes on exit. A patient's medical history is their visits in reverse order.

**Department** — created and configured by the hospital administrator inside the app, not hardcoded anywhere. Records, nursing, outpatient, laboratory, radiology, pharmacy, physiotherapy, wards, emergency, or anything else they choose. Each has a name, a description, assigned staff, and defines what kind of work it accepts and what information it records when that work is done. Adding a new department after launch must be a setup task, never a code change.

**Request** — the mechanism by which departments reach each other, and the single most important thing in this system. A clinician requests a test; it appears on the laboratory's screen with the patient, what's being asked, why, and how urgently. The laboratory does the work, records the outcome, and sends it back. The clinician is notified while the patient is still in the room. A request can be returned with a query instead of a result. Requests and their outcomes live on the patient's visit permanently.

**There is no fixed route through the hospital.** Whoever holds the patient decides where they go next. Nursing can send straight to laboratory. Laboratory can send back to the clinician. Emergency can skip everything. The system records the path taken; it does not dictate one. Any department must be able to send to any department.

**Staff** — a person with a role and a department, holding access scoped to what they do. Created by the administrator, or created automatically when a candidate is hired through recruitment.

**Vacancy, application, candidate** — the recruitment side. A vacancy is published to a public careers page. Applications arrive. Candidates are screened, ranked, shortlisted, interviewed, and hired — and on hire they become staff.

---

## What it must be able to do

Treat this as the acceptance test. If a person can sit down and perform both of these without hitting anything broken or unfinished, the build is done.

**The clinical path**

A patient walks in. Reception searches for them by name — nothing found — so they register: details captured, card type chosen, hospital number issued, file created, visit opened. The patient is sent to nursing.

Nursing sees them in their queue. Blood pressure, temperature, pulse, respiratory rate, weight, and the presenting complaint are recorded. Sent to the clinician.

The clinician opens the patient. Before reading anything, an AI-written summary of that patient's history is already on screen — conditions, current medication, what has been trending in the wrong direction, allergies, missed follow-ups. They record their examination and request a laboratory test, adding a note about what they're looking for.

The laboratory's screen shows the request immediately. They record the results. The values are stored against their normal ranges, abnormal ones flagged. Sent back to the clinician.

The clinician is notified, reviews results in the context of the patient's previous values, records the diagnosis and the plan, and prescribes.

The pharmacy screen already has the prescription. They dispense and record it. The visit closes with a follow-up appointment.

Reopen that patient afterwards: the entire day is in their permanent record, and the AI summary now reflects it.

**The recruitment path**

An administrator publishes a vacancy. It appears on the public careers page. Applications are already in the system. AI screening reads each CV against the actual requirements of the role, scores and ranks the candidates, and states its reasoning for each in writing. The administrator reviews, overrides where they disagree, shortlists, schedules an interview, records the outcome, and hires.

The hired person now exists as staff, assigned to a department, with system access — and can immediately appear as the clinician or nurse on a patient's record.

---

## The AI's role

It reads and organises. It never decides.

- **History summaries** — when a clinician opens a patient, years of record compressed into a short brief they can read in fifteen seconds.
- **Result context** — a new value shown against its normal range and against that patient's own previous readings, so change is visible rather than buried.
- **Note assistance** — clinician enters shorthand, receives a structured clinical note to edit and sign.
- **Generated documents** — discharge summaries and referral letters written from what's in the record.
- **CV screening** — candidates read against role requirements, ranked, with written reasoning.

**Hard limits, non-negotiable.** The system does not diagnose. It does not prescribe independently. It does not predict disease or make prognoses. It does not make hiring decisions. Every clinical and hiring decision is made by a person. Where the AI produces something a human must approve, the interface must make the approval step explicit and unavoidable.

---

## The character of the interface

**Light.** Clean, calm, clinical. This is software people stare at for nine-hour shifts in a hospital — it should feel unhurried and legible, never dark, never neon, never trendy. High contrast where information matters. Generous whitespace. Restrained colour used to carry meaning: something is flagged, something is urgent, something is normal. If colour isn't communicating a fact, it shouldn't be there.

Data density is a virtue here, not a problem — clinicians want to see a lot at once. Prefer clear tables and tight vertical rhythm over cards floating in space.

Every role's landing screen answers "what is waiting for me right now" without them searching for it. A nurse sees her queue. A laboratory technician sees incoming requests. A clinician sees their patients and results that have come back. The administrator sees the hospital.

The patient record is the most important screen in the system. A person's whole history should be navigable without confusion: who they are and what's dangerous about them always visible, then their summary, their visits, their readings over time, their results, their medications, their notes.

Don't announce the AI with sparkles and gradients. Present what it produces as information, clearly attributed, clearly reviewable.

---

## The data

The seed data is not filler — it carries a third of the credibility. Build a substantial, coherent, realistic Nigerian hospital:

Real-sounding Nigerian names across ethnic groups. A believable condition mix — hypertension, type 2 diabetes, malaria, typhoid, sickle cell, antenatal care, paediatric respiratory infections, minor trauma. Drugs actually dispensed in Nigerian pharmacies. Laboratory tests actually run here, with correct units and reference ranges. Nigerian phone number formats. Staff with real Nigerian hospital roles — consultant, medical officer, house officer, matron, nursing officer, laboratory scientist, pharmacist, records officer.

Backdate at least twelve months of history so that when a patient is opened, their readings plot into a real trend and their story is coherent. Some patients should be visibly deteriorating, some stable, some newly registered. Open any patient at random and there should be a plausible medical story there.

The recruitment side needs the same treatment: real-looking vacancies for a Nigerian hospital, and enough applicants per role with varied and believable CVs that ranking them is a genuine exercise.

---

## How to work

Build in vertical slices that actually run, not layers that don't. A working registration-to-record path before anything else, then departments and requests, then the AI layer, then recruitment, then the public site and careers page.

Stop and check in with me at the end of each slice — show me what works, tell me what you chose and why, and flag anything in this brief that turned out to be wrong or underspecified. Don't wait until the end.

When you have to choose between more features and a smaller number of finished ones, choose finished. An unpolished screen is worse here than a missing one.

---

## Definition of done

A person can be walked through both paths above, end to end, without excuse or explanation. Every screen they land on is complete and populated. Nothing says "coming soon". Nothing is empty. And at the end of it, the patient's record and the new staff member's profile are both real, permanent, and correct.
