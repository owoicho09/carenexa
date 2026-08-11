import { db } from "@/lib/db";

export async function getPendingRequestsForDepartmentSlug(slug: string) {
  const department = await db.department.findUnique({ where: { slug } });
  if (!department) return [];

  return db.request.findMany({
    where: { toDepartmentId: department.id, status: { in: ["PENDING", "QUERIED"] } },
    include: {
      visit: { include: { patient: true } },
      fromDepartment: true,
      requestedBy: true,
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
  });
}

export async function getPendingRequestCountForDepartmentId(departmentId: string) {
  return db.request.count({ where: { toDepartmentId: departmentId, status: { in: ["PENDING", "QUERIED"] } } });
}
