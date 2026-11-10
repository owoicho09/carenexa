"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getPendingRequestCountForDepartmentId } from "@/lib/queues";

export type NotificationFeedItem = {
  id: string;
  type: string;
  message: string;
  requestId: string | null;
  createdAt: string;
  readAt: string | null;
};

export type NotificationFeed = {
  unreadCount: number;
  queueCount: number;
  toastsEnabled: boolean;
  notifications: NotificationFeedItem[];
};

export async function getNotificationFeed(): Promise<NotificationFeed> {
  const session = await requireSession();

  const scope = {
    hospitalId: session.hospitalId,
    OR: [
      ...(session.departmentId ? [{ departmentId: session.departmentId }] : []),
      { staffId: session.staffId },
    ],
  };

  const [unreadCount, notifications, queueCount, staff] = await Promise.all([
    db.notification.count({ where: { ...scope, readAt: null } }),
    db.notification.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 20 }),
    session.departmentId ? getPendingRequestCountForDepartmentId(session.departmentId, session.hospitalId) : Promise.resolve(0),
    db.staffMember.findUnique({ where: { id: session.staffId }, select: { toastNotificationsEnabled: true } }),
  ]);

  return {
    unreadCount,
    queueCount,
    toastsEnabled: staff?.toastNotificationsEnabled ?? true,
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      requestId: n.requestId,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    })),
  };
}

export async function markNotificationReadAction(notificationId: string) {
  const session = await requireSession();
  await db.notification.updateMany({
    where: {
      id: notificationId,
      hospitalId: session.hospitalId,
      OR: [
        ...(session.departmentId ? [{ departmentId: session.departmentId }] : []),
        { staffId: session.staffId },
      ],
    },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsReadAction() {
  const session = await requireSession();
  await db.notification.updateMany({
    where: {
      hospitalId: session.hospitalId,
      readAt: null,
      OR: [
        ...(session.departmentId ? [{ departmentId: session.departmentId }] : []),
        { staffId: session.staffId },
      ],
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}
