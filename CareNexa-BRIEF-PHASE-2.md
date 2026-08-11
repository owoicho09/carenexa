# CareNexa — Phase 2 Brief: From Dashboard to Workspace

Read the original brief first. This one supersedes it where they differ, and it exists because of an honest problem with what's been built so far.

---

## What's wrong right now

The foundation is correct. Departments are configured in the app rather than hardcoded. Requests carry a route between departments. Visits hold everything that happened. Patients have permanent records with real Nigerian data. That's the hard part, and it works.

But what's on screen is an **administrator's viewer**, not a hospital's workspace. Three nav items. Read-only tables. No queues. No actions. A nurse, a laboratory scientist, a pharmacist, a front-desk officer — none of them have anywhere to go or anything to do. The system knows a request was routed from Nursing to Outpatient, but nobody can *receive* it.

The whole point of CareNexa is that a hospital runs on it. Right now nobody could run anything on it.

Phase 2 fixes that. This is the phase that makes it real software.

---

## The reframe

**A department is not a filter on the admin's data. A department is a workspace with its own front door, its own navigation, its own inbox, and its own things to do.**

Every department lives at its own address — `/records`, `/nursing`, `/clinician`, `/lab`, `/radiology`, `/pharmacy`, `/physiotherapy`, `/emergency`, `/recruitment`, `/admin`. A person logs in and lands in their own department's workspace, sees what is waiting for them, and works. They should never see another department's clutter, and they should never need anyone else to do something on their behalf.

But it is **one system**. Every department writes to the same patient record, and every department can reach every other department. Separate workspaces, shared spine.

Departments are created by the administrator, so the workspace has to be generated from the department's configuration rather than hand-built per department. A department added next year gets a working workspace the same day, with the same anatomy.

---

## Who you are decides where you land

There is no landing page, no department picker, no "choose your role" screen. **A person logs in and is already at work.**

A nurse signing in arrives in the Nursing workspace with her queue in front of her. A laboratory scientist arrives at incoming requests. A pharmacist arrives at prescriptions waiting. A front-desk officer arrives at registration and search. Their role and their department are attributes of who they are, decided when the administrator created their account — not something they select.

The address bar reflects it: they land on their department's route, and that route is their home for as long as they're signed in. Attempting to reach another department's workspace should not be possible for them.

---

## The general administrator

One role stands outside this: the **general administrator**, who oversees the entire hospital and works across every department.

They land on the hospital-wide overview — the only screen in the system that sees everything at once: who is in the building right now, patients moving between departments, every department's queue and its depth, recent registrations, staff activity, and anything that has been sitting too long unattended.

From there they can **enter any department's workspace** through a switcher that is available to them and to nobody else. Inside a department they have that department's full capability — they can work through Laboratory's queue, register a patient at the front desk, dispense from Pharmacy — and it should be visually clear that they are there as the administrator rather than as the department's own staff, so nothing they do is mistaken for the resident team's work. Returning to the hospital-wide view is always one click.

They also own everything the hospital is configured with: departments and what each accepts, staff accounts and their roles, permissions, card types and hospital number series, and the system's settings. And they see the audit trail — who did what, to which patient, when, in which department.

The general administrator is the person who runs the hospital. The interface should feel like that: oversight first, intervention available, configuration underneath.

---

## Every department workspace has the same anatomy

Different content, same shape. Build this once, drive it from configuration.

**Its own sidebar.** Relevant to that department only. Nursing sees their queue, their patients, vitals capture, ward work. Laboratory sees incoming requests, in-progress work, completed today, results entry. Pharmacy sees prescriptions waiting, dispensed today. Records sees registration, patient search, appointments, visits. Nobody sees a nav item they can't use.

**A queue tab with a live count on it.** Like unread messages on a phone — the number is visible in the sidebar without opening anything, so a laboratory scientist glancing at the screen knows five people are waiting on them. Count updates live.

**An inbox of incoming work.** When Records sends a patient to Laboratory, the laboratory's queue shows: who the patient is, what's being asked, how urgent it is, who sent it, when — and **a preview of the note the sender attached**. That note is the reason the request exists; it must be visible without opening anything.

**Actions, not just views.** Every department can act on what's in front of it: pick up work, record the outcome, send it onward to another department, query it back to the sender, or close it. Sending onward means choosing any department — the route is never fixed.

**Its own overview.** What matters to that department right now, not a copy of the administrator's screen.

---

## The overview screens

Kill the current framing. "Hospital overview — a live snapshot of CareNexa" reads like a systems monitor. This is a hospital workspace, and the top of the screen should speak to the person's work, not the software's state.

Each department's overview answers one question: **what needs me right now?** Patients waiting, requests incoming, results that have come back, things overdue. Below that, recent activity relevant to them.

The general administrator's overview is the only one that sees the whole hospital, as described above.

Make these screens feel premium. They are the first thing every member of staff sees every morning, and right now they look like a database with a stylesheet.

---

## Records / front desk

This is the busiest workspace in a Nigerian hospital and it needs to be the most complete one.

Register a patient. Edit a patient. Delete a patient with proper confirmation. Search instantly by name, phone, or hospital number. Open a visit. Send a patient to any department with a note attached. Book and manage appointments. Reprint or reissue a card.

**Quick actions belong at the top of the workspace** — register patient, find patient, open visit, send patient — reachable in one click, always, without hunting through nav. This is a desk where someone is standing in front of you.

---

## The patient record

Several specific things:

**The whole card is the click target.** Not a small "Open record" link on the right. The entire row or card opens the patient. Hover state should make that obvious.

**Visits become collapsible.** Each visit is a header — date, department, complaint, outcome, status — that expands to reveal requests, vitals, results, diagnosis, prescriptions, notes and documents. Most recent visit open by default, everything else collapsed. A patient with twenty visits should be scannable in seconds, not a mile of scrolling.

**Actions live on the record.** From a patient's page, any authorised person can send them to a department, open a visit, book an appointment, edit their details, or contact them. The record is a place work happens, not a page you look at.

---

## Contacting patients

Every patient record, and anywhere else it makes sense, gets **WhatsApp** and **Email** actions available to every department.

Composing, sending, delivery confirmation, and a permanent log of what was sent to whom and when, attached to the patient's record. Message templates for the obvious cases — appointment reminder, results ready, medication reminder, follow-up due — editable before sending.

**For now this is simulated.** No Meta or email provider integration yet. But it must be fully animated and convincing end to end: compose, send, sending state, delivered confirmation, and the message appearing permanently in the patient's communication history. Build it so the real integration slots in behind it later without the interface changing.

---

## Live notifications

The system has to feel alive.

When a department sends a patient or a request to another department, **the receiving department is notified on screen immediately** — a toast or alert that names the patient, what's being asked, and who sent it, with a click-through to the queue.

**On login, if someone has a queue waiting, tell them straight away.** A laboratory scientist arriving at 8am should see "6 requests waiting for you" before they touch anything, not discover it by clicking around.

Notifications persist somewhere reviewable, so nothing is missed because someone looked away. Unread counts on the sidebar reflect reality at all times.

---

## The CareNexa Agent

A floating, draggable bubble present on every screen, in every department, for every user. It can be moved anywhere on screen and stays where it's put.

It is an agent, not a chatbot. It **does things**:

- Finds patients — "pull up Adebayo Ogundimu", "who's waiting in my queue"
- Summarises — "summarise this patient's last six months", "what changed since her last visit"
- Acts — register a patient, open a visit, record vitals, send a patient to Laboratory with a note, record a result, dispense a prescription, book an appointment, draft and send a WhatsApp message
- Answers questions about the hospital's own data, scoped to what the person is allowed to see

**It inherits the signed-in person's permissions exactly.** A pharmacist's agent can dispense; it cannot register patients or record laboratory results. The general administrator's agent can act across every department, because they can. The agent can never do something the person couldn't do themselves through the interface — it removes clicks, never restrictions.

**Destructive or clinical actions are confirmed before they happen.** The agent proposes, shows exactly what it's about to do, and the person approves. Deleting a record, sending a message to a patient, recording a clinical outcome — these are never silent. The agent's job is to remove the clicking, not the judgement.

It should be genuinely useful, not decorative. If it can only chat, it has failed.

---

## Settings and accounts

Currently absent, and a system nobody can administer isn't a system.

Every user gets: profile and account details, change password, notification preferences, session and logout handling. Plus a password reset flow that works without being signed in.

The general administrator additionally owns: staff management — create, edit, deactivate, assign to a department, assign a role; role and permission definitions; department configuration, editable after creation; card types and hospital number series; and hospital-wide system settings.

---

## Design character

Light, calm, clinical, dense — and **premium**. The current build is functional and completely without confidence. Fix that.

Real hierarchy — a person should know where to look before they read anything. Type that carries weight where it matters. Purposeful whitespace, not empty space. Colour that means something: urgent, abnormal, waiting, done. States that exist and feel considered: hover, active, loading, empty, error. Motion that is quick and quiet — things arriving, expanding, confirming.

Empty states should never be a bare sentence on a white field. They should tell the person what goes there and give them the action to fill it.

Data density is correct for this product. Tables are good. Just make them beautiful ones.

---

## Fill the gaps yourself

The list above is what I noticed looking at six screenshots. It is not exhaustive and it isn't meant to be.

**Build this as though a real hospital opens it on Monday morning.** Where something obvious is missing that a working hospital would need — and there will be a lot — build it. Where a screen exists but a person couldn't actually do their job on it, finish it. Where a department has a queue but no way to work through it, give them one.

Judge every screen by one question: *could someone actually do their job here, or are they just looking at data?*

Tell me what you added and why when you check in.

---

## Definition of done

- Signing in as any member of staff lands them directly in their own department, already at work, with what's waiting for them in front of them.
- Signing in as the general administrator lands them on the hospital-wide view, from which they can enter and work inside any department and return in one click.
- A patient can be registered at the front desk, sent to nursing, sent to a clinician, sent to laboratory, results returned, prescribed, dispensed, and closed — with each department receiving a live notification as the patient reaches them, and each seeing the note attached by the sender.
- Every department can perform full create, read, update and delete on everything within their remit, and nobody can reach beyond it.
- The agent can be asked to do a real task in every department and it does it, within that person's permissions.
- A patient can be contacted by WhatsApp and email from their record, and the message is logged.
- Nothing anywhere is read-only that shouldn't be, and no screen exists that a person cannot work in.
