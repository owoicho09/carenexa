// Static guard: every read or bulk write on a hospital-owned table must filter
// by hospital in its arguments. This is what would have caught the unscoped
// audit-log page. Exceptions must be listed in ALLOWED with a reason.
//
// Limits (by design): single-record update/delete by ID is not checked here —
// those are expected to follow a hospital-scoped lookup, which this static
// scan cannot prove. The pattern is reviewed in code review instead.

import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

const HOSPITAL_OWNED = [
  "patient", "visit", "appointment", "communication", "request", "notification", "auditLog",
  "aiArtifact", "vacancy", "candidate", "application", "department", "cardType", "clinicalInsight",
  "rolePermission", "staffMember", "referral", "patientAccessGrant", "emergencyAccessEvent",
  "patientHospitalLink", "patientIdentityVerification",
];
const CHECKED_OPS = ["findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy", "updateMany", "deleteMany"];
const SCOPE_KEYS = /\b(hospitalId|sourceHospitalId|destinationHospitalId|receivingHospitalId|accessingHospitalId)\b/;

// file (posix, relative to src) + model.op -> reason. Keep this list short.
const ALLOWED = {
  "lib/auth.ts staffMember.findUnique": "Loads the signed-in staff member by their own ID/email to build the session.",
  "app/(dashboard)/notificationActions.ts staffMember.findUnique": "Reads the signed-in user's own toast preference (session.staffId).",
  "app/(dashboard)/settings/page.tsx staffMember.findUniqueOrThrow": "Signed-in user's own profile (session.staffId).",
  "app/(dashboard)/settings/actions.ts staffMember.findUniqueOrThrow": "Signed-in user's own password change (session.staffId).",
  "app/careers/actions.ts vacancy.findUnique": "Public careers page: only PUBLISHED vacancies are accepted, checked after load.",
  "app/careers/[vacancyId]/page.tsx vacancy.findUnique": "Public careers page: only PUBLISHED vacancies are shown, checked after load.",
  "app/careers/page.tsx vacancy.findMany": "Public careers listing of PUBLISHED vacancies across the network.",
  "app/forgot-password/actions.ts staffMember.findUnique": "Password reset lookup by email; no data is returned to the requester.",
  "app/(dashboard)/admin/staff/actions.ts staffMember.findUnique": "Email uniqueness check before creating staff — emails are unique platform-wide.",
  "app/(dashboard)/recruitment/applications/[id]/actions.ts staffMember.findUnique": "Email uniqueness check before hiring — emails are unique platform-wide.",
  "app/(dashboard)/notificationActions.ts notification.count": "Filtered via the `scope` object, which includes hospitalId (built above).",
  "app/(dashboard)/notificationActions.ts notification.findMany": "Filtered via the `scope` object, which includes hospitalId (built above).",
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === "generated" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

// Returns the text between the call's parentheses, honouring nesting and strings.
function callArguments(source, openParenIndex) {
  let depth = 0;
  let quote = null;
  for (let i = openParenIndex; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return source.slice(openParenIndex + 1, i);
  }
  return "";
}

function findUnscopedQueries() {
  const pattern = new RegExp(`\\b(?:db|tx)\\.(${HOSPITAL_OWNED.join("|")})\\.(${CHECKED_OPS.join("|")})\\s*\\(`, "g");
  const findings = [];
  for (const file of walk(SRC)) {
    const source = readFileSync(file, "utf8");
    const rel = relative(SRC, file).split(sep).join("/");
    for (const match of source.matchAll(pattern)) {
      const args = callArguments(source, match.index + match[0].length - 1);
      if (SCOPE_KEYS.test(args)) continue;
      const key = `${rel} ${match[1]}.${match[2]}`;
      if (ALLOWED[key]) continue;
      const line = source.slice(0, match.index).split("\n").length;
      findings.push(`${rel}:${line} ${match[1]}.${match[2]}(${args.replace(/\s+/g, " ").slice(0, 100)})`);
    }
  }
  return findings;
}

test("every query on a hospital-owned table is scoped to a hospital", () => {
  const findings = findUnscopedQueries();
  assert.deepEqual(findings, [], `Unscoped queries found — add a hospital filter, or an ALLOWED entry with a reason:\n${findings.join("\n")}`);
});

test("the scanner detects an unscoped query (self-check)", () => {
  const source = "await db.auditLog.findMany({ include: { actor: true }, take: 100 });";
  const args = callArguments(source, source.indexOf("("));
  assert.equal(SCOPE_KEYS.test(args), false);
  const scoped = "await db.auditLog.findMany({ where: { hospitalId: session.hospitalId } });";
  assert.equal(SCOPE_KEYS.test(callArguments(scoped, scoped.indexOf("("))), true);
});

test("the scanner handles parentheses inside strings", () => {
  const source = 'db.patient.findMany({ where: { fullName: "a)b", hospitalId } })';
  assert.match(callArguments(source, source.indexOf("(")), /hospitalId/);
});
