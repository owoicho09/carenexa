import { db } from "@/lib/db";

export async function getPendingRequestsForDepartmentSlug(slug: string, hospitalId: string) {
  const department = await db.department.findFirst({ where: { slug, hospitalId } });
  if (!department) return [];

  return db.request.findMany({
    where: { hospitalId, toDepartmentId: department.id, status: { in: ["PENDING", "QUERIED"] } },
    include: {
      visit: { include: { patient: true } },
      fromDepartment: true,
      requestedBy: true,
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
  });
}

export async function getPendingRequestCountForDepartmentId(departmentId: string, hospitalId: string) {
  return db.request.count({ where: { hospitalId, toDepartmentId: departmentId, status: { in: ["PENDING", "QUERIED"] } } });
}
