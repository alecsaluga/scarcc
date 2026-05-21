import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { prisma } from '@/lib/db'

// This endpoint initializes the database schema
// Only run this once when setting up a new deployment
export async function POST(request: Request) {
  // Simple security - require a secret key
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (key !== 'setup-db-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  }

  // Check if tables already exist
  try {
    const count = await prisma.creator.count()
    results.existingData = { creatorCount: count }
    results.status = 'Tables already exist'
    return NextResponse.json(results)
  } catch {
    // Tables don't exist, continue with setup
    results.status = 'Tables do not exist, will attempt to create'
  }

  // Try to create tables using raw SQL
  // This is a simplified version of what prisma db push does
  try {
    // Create Creator table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Creator" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "tiktokHandle" TEXT NOT NULL UNIQUE,
        "slug" TEXT NOT NULL UNIQUE,
        "email" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      )
    `)

    // Create PortalCredential table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PortalCredential" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "creatorId" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "onboardingStep" INTEGER NOT NULL DEFAULT 1,
        "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE
      )
    `)

    // Create Agreement table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Agreement" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "creatorId" TEXT NOT NULL UNIQUE,
        "acceptedAt" TIMESTAMP(3) NOT NULL,
        "version" TEXT NOT NULL,
        "agreementText" TEXT NOT NULL,
        "ipAddress" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE
      )
    `)

    // Create UploadedVideo table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UploadedVideo" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "creatorId" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "blobUrl" TEXT NOT NULL,
        "fileHash" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "mimeType" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "analysisError" TEXT,
        "rawExtraction" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE
      )
    `)

    // Create ExtractedProduct table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ExtractedProduct" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "videoId" TEXT NOT NULL,
        "brandName" TEXT NOT NULL DEFAULT '',
        "productName" TEXT NOT NULL,
        "gmv" DOUBLE PRECISION NOT NULL,
        "itemsSold" INTEGER NOT NULL,
        "confidence" DOUBLE PRECISION NOT NULL,
        "notes" TEXT,
        "productHash" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("videoId") REFERENCES "UploadedVideo"("id") ON DELETE CASCADE
      )
    `)

    // Create Opportunity table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Opportunity" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "creatorId" TEXT NOT NULL,
        "extractedProductId" TEXT UNIQUE,
        "brand" TEXT NOT NULL,
        "productName" TEXT NOT NULL,
        "tiktokShopLink" TEXT,
        "dealAmount" DOUBLE PRECISION,
        "bestContact" TEXT,
        "bestContactMethod" TEXT,
        "stage" TEXT NOT NULL DEFAULT 'ENRICHMENT',
        "creatorDecision" TEXT NOT NULL DEFAULT 'PENDING',
        "deliveryStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
        "videosCommitted" INTEGER NOT NULL DEFAULT 0,
        "videosDelivered" INTEGER NOT NULL DEFAULT 0,
        "deliveryNotes" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "closedAt" TIMESTAMP(3),
        FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE,
        FOREIGN KEY ("extractedProductId") REFERENCES "ExtractedProduct"("id")
      )
    `)

    // Create Task table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Task" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "opportunityId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "channel" TEXT,
        "stage" TEXT NOT NULL,
        "dueDate" TIMESTAMP(3) NOT NULL,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP(3),
        "isManual" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE
      )
    `)

    // Create BrandOnboarding table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BrandOnboarding" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "creatorId" TEXT NOT NULL,
        "brand" TEXT NOT NULL,
        "hasRetainer" BOOLEAN,
        "hasUsageRights" BOOLEAN,
        "shopName" TEXT,
        "bestContactMethod" TEXT,
        "bestContactName" TEXT,
        "bestContactDetails" TEXT,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE,
        UNIQUE("creatorId", "brand")
      )
    `)

    // Create SelfTrackedDeal table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SelfTrackedDeal" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "creatorId" TEXT NOT NULL,
        "brandName" TEXT NOT NULL,
        "monthlyVideosRequired" INTEGER NOT NULL DEFAULT 0,
        "completedVideos" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE
      )
    `)

    // Create indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UploadedVideo_fileHash_idx" ON "UploadedVideo"("fileHash")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UploadedVideo_creatorId_idx" ON "UploadedVideo"("creatorId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ExtractedProduct_productHash_idx" ON "ExtractedProduct"("productHash")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ExtractedProduct_videoId_idx" ON "ExtractedProduct"("videoId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Opportunity_creatorId_idx" ON "Opportunity"("creatorId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Opportunity_stage_idx" ON "Opportunity"("stage")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_opportunityId_idx" ON "Task"("opportunityId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Task_completed_idx" ON "Task"("completed")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BrandOnboarding_creatorId_idx" ON "BrandOnboarding"("creatorId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SelfTrackedDeal_creatorId_idx" ON "SelfTrackedDeal"("creatorId")`)

    results.tables = 'All tables created successfully'

    // Verify tables exist
    const count = await prisma.creator.count()
    results.verification = { creatorCount: count, status: 'OK' }

    return NextResponse.json(results)
  } catch (e) {
    results.error = e instanceof Error ? e.message : String(e)
    return NextResponse.json(results, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with ?key=setup-db-2024 to initialize the database',
  })
}
