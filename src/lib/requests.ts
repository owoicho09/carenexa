import "server-only";
import { db } from "@/lib/db";
import type { RequestUrgency } from "@/generated/prisma/enums";

export async function createRequest(input: {
  hospitalId: string;
  visitId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  requestedById: string;
  requestType: string;
  reason: string;
  urgency: RequestUrgency;
}) {
  const [visit, fromDepartment, toDepartment, requestedBy] = await Promise.all([
    db.visit.findFirst({ where: { id: input.visitId, hospitalId: input.hospitalId } }),
    db.department.findFirst({ where: { id: input.fromDepartmentId, hospitalId: input.hospitalId } }),
    db.department.findFirst({ where: { id: input.toDepartmentId, hospitalId: input.hospitalId } }),
    db.staffMember.findFirst({ where: { id: input.requestedById, hospitalId: input.hospitalId, isActive: true } }),
  ]);
  if (!visit || !fromDepartment || !toDepartment || !requestedBy) throw new Error("Request scope is invalid.");

  const request = await db.request.create({
    data: input,
    include: { visit: { include: { patient: true } }, toDepartment: true, fromDepartment: true },
  });

  await db.notification.create({
    data: {
      hospitalId: input.hospitalId,
      type: "REQUEST_INCOMING",
      message: `${request.fromDepartment.name} sent ${request.visit.patient.fullName} to you — ${request.requestType}`,
      departmentId: request.toDepartmentId,
      requestId: request.id,
    },
  });

  return request;
}

export async function completeRequest(input: {
  hospitalId: string;
  requestId: string;
  fulfilledById: string;
  outcomeSummary?: string;
  outcome?: unknown;
}) {
  const fulfiller = await db.staffMember.findFirst({ where: { id: input.fulfilledById, hospitalId: input.hospitalId, isActive: true } });
  if (!fulfiller) throw new Error("Request fulfiller is outside this hospital.");

  const request = await db.request.update({
    where: { id: input.requestId, hospitalId: input.hospitalId },
    data: {
      hospitalId: input.hospitalId,
      status: "COMPLETED",
      fulfilledById: input.fulfilledById,
      completedAt: new Date(),
      outcomeSummary: input.outcomeSummary,
      outcome: input.outcome === undefined ? undefined : (input.outcome as never),
    },
    include: { visit: { include: { patient: true } }, toDepartment: true },
  });

  await db.notification.create({
    data: {
      hospitalId: input.hospitalId,
      type: "REQUEST_COMPLETED",
      message: `${request.toDepartment.name} completed your ${request.requestType} request for ${request.visit.patient.fullName}`,
      staffId: request.requestedById,
      requestId: request.id,
    },
  });

  return request;
}

export async function queryRequest(input: { hospitalId: string; requestId: string; fulfilledById: string; queryNote: string }) {
  const fulfiller = await db.staffMember.findFirst({ where: { id: input.fulfilledById, hospitalId: input.hospitalId, isActive: true } });
  if (!fulfiller) throw new Error("Request fulfiller is outside this hospital.");

  const request = await db.request.update({
    where: { id: input.requestId, hospitalId: input.hospitalId },
    data: {
      status: "QUERIED",
      fulfilledById: input.fulfilledById,
      queryNote: input.queryNote,
    },
    include: { visit: { include: { patient: true } }, toDepartment: true },
  });

  await db.notification.create({
    data: {
      hospitalId: input.hospitalId,
      type: "REQUEST_QUERIED",
      message: `${request.toDepartment.name} sent back a query on your ${request.requestType} request for ${request.visit.patient.fullName}`,
      staffId: request.requestedById,
      requestId: request.id,
    },
  });

  return request;
}
