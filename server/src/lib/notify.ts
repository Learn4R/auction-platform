import type { Notification, NotificationType, Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { getIO } from '../realtime/io.js'

export interface NotificationInput {
  userId: string
  type: NotificationType
  message: string
  itemId?: string | null
  auctionId?: string | null
}

export function createNotification(
  client: Prisma.TransactionClient | typeof prisma,
  input: NotificationInput,
): Promise<Notification> {
  return client.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      itemId: input.itemId ?? null,
      auctionId: input.auctionId ?? null,
    },
  })
}

export function broadcastNotification(notification: Notification) {
  getIO().to(`user:${notification.userId}`).emit('notification:new', notification)
}

export function broadcastNotifications(notifications: Notification[]) {
  for (const n of notifications) broadcastNotification(n)
}

// For call sites outside a transaction: create then immediately broadcast.
export async function notifyNow(
  client: Prisma.TransactionClient | typeof prisma,
  input: NotificationInput,
): Promise<Notification> {
  const notification = await createNotification(client, input)
  broadcastNotification(notification)
  return notification
}
