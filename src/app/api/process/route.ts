import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { getAnalysisProvider } from '@/lib/ai-analysis'
import { checkVideoDuplicate, processExtractedProducts, createOpportunitiesFromProducts } from '@/lib/deduplication'
import { generateTasksForOpportunity } from '@/lib/task-service'
import { generateSlug } from '@/lib/utils'

export const maxDuration = 300 // 5 minutes max for Pro plan

interface VideoBlob {
  url: string
  filename: string
  size: number
  contentType: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, tiktokHandle, videos } = body as {
      name: string
      tiktokHandle: string
      videos: VideoBlob[]
    }

    // Validate inputs
    if (!name || !tiktokHandle || !videos || videos.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tiktokHandle, and videos are required' },
        { status: 400 }
      )
    }

    console.log('[Process] Starting processing for:', name, tiktokHandle, `(${videos.length} videos)`)

    // Find or create creator
    const slug = generateSlug(name, tiktokHandle)
    let creator = await prisma.creator.findUnique({
      where: { tiktokHandle },
    })

    if (!creator) {
      creator = await prisma.creator.create({
        data: {
          name,
          tiktokHandle,
          slug,
        },
      })
      console.log('[Process] Created new creator:', creator.id)
    } else {
      console.log('[Process] Found existing creator:', creator.id)
    }

    const analyzer = getAnalysisProvider()

    // Track all products and video IDs across all videos
    let totalProductsExtracted = 0
    const allProductIds: string[] = []
    const videoIds: string[] = []
    let duplicateCount = 0

    // Process each video
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      console.log(`[Process] Processing video ${i + 1}/${videos.length}: ${video.filename}`)

      // Generate file hash from URL for deduplication (use URL as proxy for content)
      const fileHash = createHash('sha256').update(video.url).digest('hex')

      // Check for duplicate video
      const { isDuplicate, existingVideoId } = await checkVideoDuplicate(creator.id, fileHash)

      if (isDuplicate) {
        console.log(`[Process] Video ${video.filename} already processed, skipping`)
        if (existingVideoId) videoIds.push(existingVideoId)
        duplicateCount++
        continue
      }

      // Create video record with PROCESSING status
      const videoRecord = await prisma.uploadedVideo.create({
        data: {
          creatorId: creator.id,
          filename: video.filename,
          blobUrl: video.url,
          fileHash,
          fileSize: video.size,
          mimeType: video.contentType || 'video/mp4',
          status: 'PROCESSING',
        },
      })
      videoIds.push(videoRecord.id)
      console.log('[Process] Created video record:', videoRecord.id)

      // Analyze video using the blob URL directly
      console.log(`[Process] Starting video analysis for ${video.filename}...`)
      const analysisResult = await analyzer.analyzeVideoFromUrl(video.url, name, video.filename)

      if (!analysisResult.success) {
        console.error(`[Process] Analysis failed for ${video.filename}:`, analysisResult.error)
        await prisma.uploadedVideo.update({
          where: { id: videoRecord.id },
          data: {
            status: 'FAILED',
            analysisError: analysisResult.error,
          },
        })
        continue // Continue with other videos
      }

      console.log(`[Process] Analysis complete for ${video.filename}, found ${analysisResult.products.length} products`)
      totalProductsExtracted += analysisResult.products.length

      // Update video with raw extraction
      await prisma.uploadedVideo.update({
        where: { id: videoRecord.id },
        data: {
          status: 'COMPLETED',
          rawExtraction: analysisResult.rawExtraction,
        },
      })

      // Process extracted products with deduplication
      const productIds = await processExtractedProducts(
        creator.id,
        videoRecord.id,
        analysisResult.products
      )
      allProductIds.push(...productIds)
      console.log(`[Process] Created/updated ${productIds.length} product IDs from ${video.filename}`)
    }

    // All videos were duplicates
    if (allProductIds.length === 0 && duplicateCount === videos.length) {
      return NextResponse.json({
        success: true,
        message: 'All videos already processed',
        duplicate: true,
        creator: {
          id: creator.id,
          slug: creator.slug,
          portalUrl: `/portal/${creator.slug}`,
        },
        videoIds,
      })
    }

    // Create opportunities from all products (deduplicated)
    const uniqueProductIds = Array.from(new Set(allProductIds))
    console.log('[Process] Creating opportunities for', uniqueProductIds.length, 'unique products')
    const opportunityIds = await createOpportunitiesFromProducts(creator.id, uniqueProductIds)
    console.log('[Process] Created opportunity IDs:', opportunityIds)

    // Generate tasks for each new opportunity
    for (const oppId of opportunityIds) {
      console.log('[Process] Generating tasks for opportunity:', oppId)
      await generateTasksForOpportunity(oppId)
    }

    return NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        slug: creator.slug,
        portalUrl: `/portal/${creator.slug}`,
      },
      videoIds,
      videosProcessed: videos.length - duplicateCount,
      videosDuplicate: duplicateCount,
      productsExtracted: totalProductsExtracted,
      opportunitiesCreated: opportunityIds.length,
    })
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}
