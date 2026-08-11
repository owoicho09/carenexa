import "server-only";
import { db } from "@/lib/db";
import type { RequestUrgency } from "@/generated/prisma/enums";

export async function createRequest(input: {
  visitId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  requestedById: string;
  requestType: string;
  reason: string;
  urgency: RequestUrgency;
}) {
  const request = await db.request.create({
    data: input,
    include: { visit: { include: { patient: true } }, toDepartment: true, fromDepartment: true },
  });

  await db.notification.create({
    data: {
      type: "REQUEST_INCOMING",
      message: `${request.fromDepartment.name} sent ${request.visit.patient.fullName} to you — ${request.requestType}`,
      departmentId: request.toDepartmentId,
      requestId: request.id,
    },
  });

  return request;
}

export async function completeRequest(input: {
  requestId: string;
  fulfilledById: string;
  outcomeSummary?: string;
  outcome?: unknown;
}) {
  const request = await db.request.update({
    where: { id: input.requestId },
    data: {
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
      type: "REQUEST_COMPLETED",
      message: `${request.toDepartment.name} completed your ${request.requestType} request for ${request.visit.patient.fullName}`,
      staffId: request.requestedById,
      requestId: request.id,
    },
  });

  return request;
}

export async function queryRequest(input: { requestId: string; fulfilledById: string; queryNote: string }) {
  const request = await db.request.update({
    where: { id: input.requestId },
    data: {
      status: "QUERIED",
      fulfilledById: input.fulfilledById,
      queryNote: input.queryNote,
    },
    include: { visit: { include: { patient: true } }, toDepartment: true },
  });

  await db.notification.create({
    data: {
      type: "REQUEST_QUERIED",
      message: `${request.toDepartment.name} sent back a query on your ${request.requestType} request for ${request.visit.patient.fullName}`,
      staffId: request.requestedById,
      requestId: request.id,
    },
  });

  return request;
}
