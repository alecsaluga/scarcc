import { prisma } from './db'
import { generateProductHash } from './utils'
import type { ExtractedProductData } from './ai-analysis'

// Check if a video with this hash already exists for this creator
export async function checkVideoDuplicate(
  creatorId: string,
  fileHash: string
): Promise<{ isDuplicate: boolean; existingVideoId?: string }> {
  const existing = await prisma.uploadedVideo.findFirst({
    where: {
      creatorId,
      fileHash,
    },
  })

  return {
    isDuplicate: !!existing,
    existingVideoId: existing?.id,
  }
}

// Process extracted products with deduplication
// Returns created/updated extracted product IDs
export async function processExtractedProducts(
  creatorId: string,
  videoId: string,
  products: ExtractedProductData[]
): Promise<string[]> {
  const productIds: string[] = []

  for (const product of products) {
    const productHash = generateProductHash(creatorId, product.productName)

    // Check if this product already exists for this creator
    const existing = await prisma.extractedProduct.findFirst({
      where: { productHash },
    })

    if (existing) {
      // Merge with existing - preserve stronger values
      const updatedGmv = Math.max(existing.gmv, product.gmv)
      const updatedItemsSold = Math.max(existing.itemsSold, product.itemsSold)
      const updatedConfidence = Math.max(existing.confidence, product.confidence)
      const updatedNotes = product.notes || existing.notes
      // Use new brandName if provided (AI extraction), otherwise keep existing
      const updatedBrandName = product.brandName || existing.brandName

      const updated = await prisma.extractedProduct.update({
        where: { id: existing.id },
        data: {
          brandName: updatedBrandName,
          gmv: updatedGmv,
          itemsSold: updatedItemsSold,
          confidence: updatedConfidence,
          notes: updatedNotes,
        },
      })

      productIds.push(updated.id)
    } else {
      // Create new extracted product with AI-extracted brandName
      const created = await prisma.extractedProduct.create({
        data: {
          videoId,
          brandName: product.brandName,
          productName: product.productName,
          gmv: product.gmv,
          itemsSold: product.itemsSold,
          confidence: product.confidence,
          notes: product.notes,
          productHash,
        },
      })

      productIds.push(created.id)
    }
  }

  return productIds
}

// Create opportunities for extracted products (if not already linked)
export async function createOpportunitiesFromProducts(
  creatorId: string,
  productIds: string[]
): Promise<string[]> {
  const opportunityIds: string[] = []

  for (const productId of productIds) {
    // Check if opportunity already exists for this product
    const existingOpp = await prisma.opportunity.findFirst({
      where: { extractedProductId: productId },
    })

    if (existingOpp) {
      opportunityIds.push(existingOpp.id)
      continue
    }

    // Get the extracted product
    const product = await prisma.extractedProduct.findUnique({
      where: { id: productId },
    })

    if (!product) continue

    // Use the AI-extracted brandName, fall back to product name for legacy records
    const brand = product.brandName || product.productName

    // Check for existing brand onboarding to prefill contact info
    const brandOnboarding = await prisma.brandOnboarding.findFirst({
      where: {
        creatorId,
        brand: { contains: brand },
      },
    })

    // Create new opportunity
    const opportunity = await prisma.opportunity.create({
      data: {
        creatorId,
        extractedProductId: productId,
        brand,
        productName: product.productName,
        stage: 'ENRICHMENT',
        creatorDecision: 'PENDING',
        bestContact: brandOnboarding?.bestContactDetails || null,
        bestContactMethod: brandOnboarding?.bestContactMethod || null,
      },
    })

    opportunityIds.push(opportunity.id)
  }

  return opportunityIds
}
