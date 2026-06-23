import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

// Upload CSV data for a creator
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { creatorId, csvData } = body

    if (!creatorId || !csvData) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, csvData' },
        { status: 400 }
      )
    }

    // Get the first video for this creator
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

    // Parse CSV
    const lines = csvData.trim().split('\n')
    const products: Array<{
      brandName: string
      productName: string
      gmv: number
      itemsSold: number
    }> = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      // Skip header row if it looks like one
      if (trimmedLine.toLowerCase().includes('brandname') ||
          trimmedLine.toLowerCase().includes('brand name') ||
          trimmedLine.toLowerCase().includes('product')) {
        continue
      }

      // Split by comma, handling quoted values
      const parts = trimmedLine.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''))

      if (parts.length < 2) continue

      const brandName = parts[0] || 'Unknown'
      const productName = parts[1]
      const gmv = parseFloat(parts[2]) || 0
      const itemsSold = parseInt(parts[3]) || 0

      if (productName) {
        products.push({ brandName, productName, gmv, itemsSold })
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No valid products found in CSV data' },
        { status: 400 }
      )
    }

    // Create products and opportunities
    let productsAdded = 0
    for (const product of products) {
      const productHash = crypto
        .createHash('md5')
        .update(`${product.brandName}-${product.productName}`.toLowerCase())
        .digest('hex')

      // Check if product already exists for this creator
      const existing = await prisma.extractedProduct.findFirst({
        where: {
          productHash,
          video: {
            creatorId,
          },
        },
      })

      if (!existing) {
        const createdProduct = await prisma.extractedProduct.create({
          data: {
            videoId: video.id,
            brandName: product.brandName,
            productName: product.productName,
            gmv: product.gmv,
            itemsSold: product.itemsSold,
            confidence: 1.0,
            productHash,
          },
        })

        await prisma.opportunity.create({
          data: {
            creatorId,
            extractedProductId: createdProduct.id,
            brand: product.brandName,
            productName: product.productName,
            stage: 'ENRICHMENT',
            creatorDecision: 'PENDING',
          },
        })

        productsAdded++
      }
    }

    return NextResponse.json({
      success: true,
      productsAdded,
      totalInCSV: products.length,
    })
  } catch (error) {
    console.error('Error uploading CSV:', error)
    return NextResponse.json(
      { error: 'Failed to process CSV data' },
      { status: 500 }
    )
  }
}
