import "server-only";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, homeRoute } from "@/lib/auth";
import { getPendingRequestCountForDepartmentId } from "@/lib/queues";

// Every department workspace goes through this: resolves the department the
// URL asked for, and enforces that only its own staff (or the general
// administrator, entering through the switcher) can be inside it.
export async function requireDepartmentAccess(slug: string) {
  const session = await requireSession();

  const department = await db.department.findFirst({ where: { slug, hospitalId: session.hospitalId } });
  if (!department) notFound();

  const isOwnDepartment = session.departmentSlug === slug;
  const isAdminVisiting = session.role === "ADMIN" && !isOwnDepartment;

  if (!isOwnDepartment && session.role !== "ADMIN") {
    redirect(homeRoute(session));
  }

  const queueCount = await getPendingRequestCountForDepartmentId(department.id, session.hospitalId);

  return { session, department, isAdminVisiting, queueCount };
}
