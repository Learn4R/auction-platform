import { prisma } from './prisma.js'

export function logAdminAction(adminId: string, action: string, target: string) {
  return prisma.adminAction.create({ data: { adminId, action, target } })
}
