import bcrypt from 'bcrypt'
import { prisma } from '../src/lib/prisma.js'

async function main() {
  const seller = await prisma.user.upsert({
    where: { email: 'seller@mudrahouse.in' },
    update: {},
    create: {
      name: 'Kohinoor Numismatics',
      email: 'seller@mudrahouse.in',
      password: await bcrypt.hash('password123', 10),
      role: 'seller',
    },
  })

  const categoryDefs = [
    { name: 'British India Coins', slug: 'british-india-coins' },
    { name: 'Mughal Coins', slug: 'mughal-coins' },
    { name: 'Princely State Coins', slug: 'princely-state-coins' },
    { name: 'Rare Currency Notes', slug: 'rare-currency-notes' },
  ]

  const categories: Record<string, { id: string }> = {}
  for (const def of categoryDefs) {
    categories[def.slug] = await prisma.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: def,
    })
  }

  const now = Date.now()
  const MIN = 60 * 1000
  const HR = 60 * MIN
  const DAY = 24 * HR

  const items = [
    {
      title: 'British India King George V Silver Rupee, 1901',
      description:
        'A well-struck silver rupee from the reign of King George V, Calcutta mint. Strong portrait detail with light cabinet toning and minimal handling marks.',
      categorySlug: 'british-india-coins',
      year: 1901,
      material: 'Silver (91.7%)',
      condition: 'Extremely Fine',
      images: [],
      auction: {
        status: 'live' as const,
        startingBid: '30000',
        currentBid: '48000',
        bidIncrement: '1000',
        startTime: new Date(now - 2 * HR),
        endTime: new Date(now + 7 * MIN),
      },
    },
    {
      title: 'Victoria Empress Silver Rupee, 1862',
      description:
        'An early Victoria Empress issue with a bold, near-uncirculated strike. Attractive light golden toning around the devices.',
      categorySlug: 'british-india-coins',
      year: 1862,
      material: 'Silver (91.7%)',
      condition: 'About Uncirculated',
      images: [],
      auction: {
        status: 'live' as const,
        startingBid: '25000',
        currentBid: '39500',
        bidIncrement: '1500',
        startTime: new Date(now - 3 * HR),
        endTime: new Date(now + 4 * MIN),
      },
    },
    {
      title: 'Mughal Silver Rupee, Shah Jahan, Surat Mint',
      description:
        'A well-centred Surat mint rupee bearing a clear mint name and regnal year in Persian script, struck under Emperor Shah Jahan.',
      categorySlug: 'mughal-coins',
      year: 1636,
      material: 'Silver',
      condition: 'Very Fine',
      images: [],
      auction: {
        status: 'live' as const,
        startingBid: '60000',
        currentBid: '96000',
        bidIncrement: '3000',
        startTime: new Date(now - 90 * MIN),
        endTime: new Date(now + 12 * MIN),
      },
    },
    {
      title: 'Hyderabad State Silver Coin, Nizam Era',
      description:
        'A well-preserved silver coin issued under the Nizam of Hyderabad, with crisp Persian legends on both faces.',
      categorySlug: 'princely-state-coins',
      year: 1900,
      material: 'Silver',
      condition: 'Extremely Fine',
      images: [],
      auction: {
        status: 'upcoming' as const,
        startingBid: '18000',
        currentBid: null,
        bidIncrement: '1000',
        startTime: new Date(now + 3 * HR),
        endTime: new Date(now + 3 * HR + 2 * DAY),
      },
    },
    {
      title: 'Fancy Serial Number Ten Rupee Note "786786"',
      description:
        'An uncirculated ten rupee note with the sought-after repeater serial number 786786, crisp corners and original sheen.',
      categorySlug: 'rare-currency-notes',
      year: 1985,
      material: 'Paper',
      condition: 'Uncirculated',
      images: [],
      auction: {
        status: 'upcoming' as const,
        startingBid: '12000',
        currentBid: null,
        bidIncrement: '1000',
        startTime: new Date(now + 8 * HR),
        endTime: new Date(now + 8 * HR + 3 * DAY),
      },
    },
    {
      title: 'George VI Silver Half Rupee, 1945',
      description:
        'A crisp uncirculated half rupee from the final wartime silver series, full mint lustre visible under light.',
      categorySlug: 'british-india-coins',
      year: 1945,
      material: 'Silver (50%)',
      condition: 'Uncirculated',
      images: [],
      auction: {
        status: 'ended' as const,
        startingBid: '10000',
        currentBid: '17500',
        bidIncrement: '500',
        startTime: new Date(now - 4 * DAY),
        endTime: new Date(now - 2 * DAY),
      },
    },
  ]

  for (const def of items) {
    const existing = await prisma.item.findFirst({ where: { title: def.title } })
    if (existing) continue

    await prisma.item.create({
      data: {
        title: def.title,
        description: def.description,
        categoryId: categories[def.categorySlug]!.id,
        year: def.year,
        material: def.material,
        condition: def.condition,
        images: def.images,
        sellerId: seller.id,
        status: 'approved',
        auction: { create: def.auction },
      },
    })
  }

  console.log(`Seeded ${categoryDefs.length} categories and ${items.length} items.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
