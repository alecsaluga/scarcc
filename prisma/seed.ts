import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample creators
  const creators = [
    {
      name: 'Sarah Johnson',
      tiktokHandle: 'sarahjcreates',
      slug: 'sarah-johnson-sarahjcreates',
      email: 'sarah@example.com',
    },
    {
      name: 'Mike Chen',
      tiktokHandle: 'mikechenbeauty',
      slug: 'mike-chen-mikechenbeauty',
      email: 'mike@example.com',
    },
    {
      name: 'Emma Williams',
      tiktokHandle: 'emmawstyle',
      slug: 'emma-williams-emmawstyle',
      email: null,
    },
  ]

  for (const creatorData of creators) {
    const creator = await prisma.creator.upsert({
      where: { tiktokHandle: creatorData.tiktokHandle },
      update: {},
      create: creatorData,
    })

    console.log(`Created creator: ${creator.name}`)

    // Create portal credentials for Sarah (completed onboarding)
    if (creatorData.tiktokHandle === 'sarahjcreates') {
      const passwordHash = await bcrypt.hash('demo123', 12)
      await prisma.portalCredential.upsert({
        where: { creatorId: creator.id },
        update: {},
        create: {
          creatorId: creator.id,
          passwordHash,
          onboardingStep: 3,
          onboardingComplete: true,
        },
      })

      await prisma.agreement.upsert({
        where: { creatorId: creator.id },
        update: {},
        create: {
          creatorId: creator.id,
          acceptedAt: new Date(),
          version: '1.0',
          agreementText: 'Authorization agreement text...',
        },
      })
    }

    // Create sample video for each creator
    const video = await prisma.uploadedVideo.upsert({
      where: {
        id: `video-${creator.id}`,
      },
      update: {},
      create: {
        id: `video-${creator.id}`,
        creatorId: creator.id,
        filename: 'sample-video.mp4',
        blobUrl: 'https://example.com/sample-video.mp4',
        fileHash: `hash-${creator.id}`,
        fileSize: 1024000,
        mimeType: 'video/mp4',
        status: 'COMPLETED',
        rawExtraction: JSON.stringify({ products: [] }),
      },
    })

    // Create sample extracted products and opportunities
    const products = [
      {
        name: 'Viral Skincare Serum',
        gmv: 15420,
        itemsSold: 342,
        brand: 'GlowUp Beauty',
      },
      {
        name: 'LED Face Mask Pro',
        gmv: 28750,
        itemsSold: 215,
        brand: 'TechBeauty',
      },
      {
        name: 'Hair Growth Oil Bundle',
        gmv: 8920,
        itemsSold: 445,
        brand: 'HairMagic',
      },
    ]

    // Only add products to first two creators
    if (creatorData.tiktokHandle !== 'emmawstyle') {
      for (let i = 0; i < products.length; i++) {
        const product = products[i]
        const productHash = `${creator.id}-${product.name.toLowerCase().replace(/\s/g, '-')}`

        const extractedProduct = await prisma.extractedProduct.upsert({
          where: { id: `ep-${creator.id}-${i}` },
          update: {},
          create: {
            id: `ep-${creator.id}-${i}`,
            videoId: video.id,
            productName: product.name,
            gmv: product.gmv,
            itemsSold: product.itemsSold,
            confidence: 0.92,
            productHash,
          },
        })

        // Create opportunity with varying stages
        const stages = ['ENRICHMENT', 'OUTREACH', 'NEGOTIATION', 'CLOSED', 'FOLLOW_UP_1']
        const stage = stages[i % stages.length]

        const opportunity = await prisma.opportunity.upsert({
          where: { id: `opp-${creator.id}-${i}` },
          update: {},
          create: {
            id: `opp-${creator.id}-${i}`,
            creatorId: creator.id,
            extractedProductId: extractedProduct.id,
            brand: product.brand,
            productName: product.name,
            stage: stage as any,
            dealAmount: stage === 'NEGOTIATION' || stage === 'CLOSED' ? Math.floor(Math.random() * 5000) + 1000 : null,
            creatorDecision: stage === 'CLOSED' ? 'ACCEPTED' : 'PENDING',
            deliveryStatus: stage === 'CLOSED' ? 'IN_PROGRESS' : 'NOT_STARTED',
            videosCommitted: stage === 'CLOSED' ? 3 : 0,
            videosDelivered: stage === 'CLOSED' ? 1 : 0,
          },
        })

        // Create sample tasks
        const now = new Date()
        const tasks = [
          {
            title: 'Enrich product link',
            stage: 'ENRICHMENT',
            dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
            completed: stage !== 'ENRICHMENT',
          },
          {
            title: 'Identify brand contact',
            stage: 'ENRICHMENT',
            dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            completed: stage !== 'ENRICHMENT',
          },
          {
            title: 'Send initial outreach email',
            stage: 'OUTREACH',
            dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
            completed: ['NEGOTIATION', 'CLOSED', 'FOLLOW_UP_1', 'FOLLOW_UP_2'].includes(stage),
          },
          {
            title: 'Follow-up email',
            stage: 'FOLLOW_UP_1',
            dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
            completed: ['NEGOTIATION', 'CLOSED'].includes(stage),
          },
        ]

        for (let j = 0; j < tasks.length; j++) {
          const task = tasks[j]
          await prisma.task.upsert({
            where: { id: `task-${opportunity.id}-${j}` },
            update: {},
            create: {
              id: `task-${opportunity.id}-${j}`,
              opportunityId: opportunity.id,
              title: task.title,
              stage: task.stage as any,
              dueDate: task.dueDate,
              completed: task.completed,
              completedAt: task.completed ? new Date() : null,
              isManual: false,
            },
          })
        }

        console.log(`Created opportunity: ${product.brand} for ${creator.name}`)
      }
    }

    // Create brand onboarding for Sarah
    if (creatorData.tiktokHandle === 'sarahjcreates') {
      await prisma.brandOnboarding.upsert({
        where: {
          creatorId_brand: {
            creatorId: creator.id,
            brand: 'GlowUp Beauty',
          },
        },
        update: {},
        create: {
          creatorId: creator.id,
          brand: 'GlowUp Beauty',
          hasRetainer: false,
          hasUsageRights: true,
          shopName: 'GlowUp Official',
          bestContactMethod: 'Email',
          bestContactName: 'John Smith',
          bestContactDetails: 'john@glowupbeauty.com',
          completed: true,
        },
      })

      // Create self-tracked deal
      await prisma.selfTrackedDeal.upsert({
        where: { id: `std-${creator.id}-1` },
        update: {},
        create: {
          id: `std-${creator.id}-1`,
          creatorId: creator.id,
          brandName: 'BeautyBrand XYZ',
          monthlyVideosRequired: 4,
          completedVideos: 2,
        },
      })
    }
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
