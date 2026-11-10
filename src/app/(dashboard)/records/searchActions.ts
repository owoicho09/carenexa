"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function getOpenVisitForPatient(patientId: string) {
  const session = await requireSession();
  const visit = await db.visit.findFirst({ where: { hospitalId: session.hospitalId, patientId, status: "OPEN" } });
  return visit?.id ?? null;
}

export async function searchPatients(query: string) {
  const session = await requireSession();
  const q = query.trim();
  if (q.length < 2) return [];

  return db.patient.findMany({
    where: {
      hospitalId: session.hospitalId,
      isDeleted: false,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { hospitalNumber: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, hospitalNumber: true, phone: true },
    take: 8,
    orderBy: { fullName: "asc" },
  });
}
