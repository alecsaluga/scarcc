import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

// Add a product manually for a creator
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { creatorId, brandName, productName, gmv, itemsSold } = body

    if (!creatorId || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, productName' },
        { status: 400 }
      )
    }

    // Get the first video for this creator (we need a video to attach the product to)
    const video = await prisma.uploadedVideo.findFirst({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
    })

    if (!video) {
      return NextResponse.json(
        { error: 'No video found for this creator' },
        { status: 400 }
      )
    }

    // Generate product hash for deduplication
    const productHash = crypto
      .createHash('md5')
      .update(`${brandName || 'unknown'}-${productName}`.toLowerCase())
      .digest('hex')

    // Create the extracted product
    const product = await prisma.extractedProduct.create({
      data: {
        videoId: video.id,
        brandName: brandName || 'Unknown',
        productName,
        gmv: gmv || 0,
        itemsSold: itemsSold || 0,
        confidence: 1.0, // Manual entry has full confidence
        productHash,
      },
    })

    // Also create an opportunity for this product
    await prisma.opportunity.create({
      data: {
        creatorId,
        extractedProductId: product.id,
        brand: brandName || 'Unknown',
        productName,
        stage: 'ENRICHMENT',
        creatorDecision: 'PENDING',
      },
    })

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error('Error adding product:', error)
    return NextResponse.json(
      { error: 'Failed to add product' },
      { status: 500 }
    )
  }
}
