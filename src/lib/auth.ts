import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { StaffRole } from "@/generated/prisma/enums";
import { SESSION_COOKIE } from "@/lib/sessionConstants";

export { SESSION_COOKIE };
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h shift-length session

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  staffId: string;
  fullName: string;
  role: StaffRole;
  departmentId: string | null;
  departmentSlug: string | null;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    // Sessions signed before departmentSlug existed are stale — force a fresh login
    // rather than let workspace routing compute a route from a missing field.
    if (!("departmentSlug" in payload)) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function verifyCredentials(email: string, password: string) {
  const staff = await db.staffMember.findUnique({ where: { email }, include: { department: true } });
  if (!staff || !staff.isActive) return null;
  const valid = await bcrypt.compare(password, staff.passwordHash);
  if (!valid) return null;
  return staff;
}

export async function requireSession(allowedRoles?: StaffRole[]) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(session.role)) redirect(homeRoute(session));
  return session;
}

// Where a person lands after login — their own department's workspace, or the
// hospital-wide view for the general administrator. Departments are data, not
// a fixed map, so this is derived from the session's departmentSlug rather
// than hardcoded per role.
export function homeRoute(session: SessionPayload) {
  if (session.role === "ADMIN") return "/admin";
  return session.departmentSlug ? `/${session.departmentSlug}` : "/admin";
}
