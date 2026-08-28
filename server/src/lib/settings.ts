import type { Prisma, PrismaClient } from '@prisma/client'

const SETTINGS_ID = 'singleton'

type Client = PrismaClient | Prisma.TransactionClient

export async function getPlatformSettings(client: Client) {
  return client.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  })
}

export async function getBuyerPremiumPercent(client: Client): Promise<number> {
  const settings = await getPlatformSettings(client)
  return Number(settings.buyerPremiumPercent)
}

export async function getSellerCommissionPercent(client: Client): Promise<number> {
  const settings = await getPlatformSettings(client)
  return Number(settings.sellerCommissionPercent)
}
