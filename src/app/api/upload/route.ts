import { NextRequest, NextResponse } from 'next/server'
import { writeFile, rm, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID, createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { getStorage } from '@/lib/storage'
import { getAnalysisProvider } from '@/lib/ai-analysis'
import { checkVideoDuplicate, processExtractedProducts, createOpportunitiesFromProducts } from '@/lib/deduplication'
import { generateTasksForOpportunity } from '@/lib/task-service'
import { generateSlug } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const tempPaths: string[] = []

  try {
    const formData = await request.formData()
    const name = formData.get('name') as string
    const tiktokHandle = formData.get('tiktokHandle') as string
    const videoCount = parseInt(formData.get('videoCount') as string) || 1

    // Collect all video files
    const videos: File[] = []
    for (let i = 0; i < videoCount; i++) {
      const video = formData.get(`video_${i}`) as File
      if (video) {
        videos.push(video)
      }
    }

    // Fallback for single video (backward compatibility)
    if (videos.length === 0) {
      const singleVideo = formData.get('video') as File
      if (singleVideo) {
        videos.push(singleVideo)
      }
    }

    // Validate inputs
    if (!name || !tiktokHandle || videos.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tiktokHandle, and at least one video are required' },
        { status: 400 }
      )
    }

    console.log('[Upload] Starting upload for:', name, tiktokHandle, `(${videos.length} videos)`)

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
      console.log('[Upload] Created new creator:', creator.id)
    } else {
      console.log('[Upload] Found existing creator:', creator.id)
    }

    // Create uploads directory
    const uploadsDir = path.join(os.tmpdir(), 'scarcc-uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const storage = getStorage()
    const analyzer = getAnalysisProvider()

    // Track all products and video IDs across all videos
    let totalProductsExtracted = 0
    const allProductIds: string[] = []
    const videoIds: string[] = []
    let duplicateCount = 0

    // Process each video
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]
      console.log(`[Upload] Processing video ${i + 1}/${videos.length}: ${video.name}`)

      // Read video buffer
      const buffer = Buffer.from(await video.arrayBuffer())

      // Generate file hash for deduplication
      const fileHash = createHash('sha256').update(buffer).digest('hex')

      // Check for duplicate video
      const { isDuplicate, existingVideoId } = await checkVideoDuplicate(creator.id, fileHash)

      if (isDuplicate) {
        console.log(`[Upload] Video ${video.name} already processed, skipping`)
        if (existingVideoId) videoIds.push(existingVideoId)
        duplicateCount++
        continue
      }

      // Save video to temp file for Gemini analysis
      const tempPath = path.join(uploadsDir, `${randomUUID()}-${video.name}`)
      await writeFile(tempPath, buffer)
      tempPaths.push(tempPath)
      console.log('[Upload] Saved temp file:', tempPath)

      // Also upload to permanent storage
      const storagePath = `${creator.id}/${Date.now()}-${video.name}`
      const uploadResult = await storage.upload(video, storagePath)
      console.log('[Upload] Saved to storage:', uploadResult.url)

      // Create video record with PROCESSING status
      const videoRecord = await prisma.uploadedVideo.create({
        data: {
          creatorId: creator.id,
          filename: video.name,
          blobUrl: uploadResult.url,
          fileHash,
          fileSize: buffer.length,
          mimeType: video.type || 'video/mp4',
          status: 'PROCESSING',
        },
      })
      videoIds.push(videoRecord.id)
      console.log('[Upload] Created video record:', videoRecord.id)

      // Analyze video using the temp file path
      console.log(`[Upload] Starting video analysis for ${video.name}...`)
      const analysisResult = await analyzer.analyzeVideo(tempPath, name, video.name)

      if (!analysisResult.success) {
        console.error(`[Upload] Analysis failed for ${video.name}:`, analysisResult.error)
        await prisma.uploadedVideo.update({
          where: { id: videoRecord.id },
          data: {
            status: 'FAILED',
            analysisError: analysisResult.error,
          },
        })
        continue // Continue with other videos
      }

      console.log(`[Upload] Analysis complete for ${video.name}, found ${analysisResult.products.length} products`)
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
      console.log(`[Upload] Created/updated ${productIds.length} product IDs from ${video.name}`)
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
    console.log('[Upload] Creating opportunities for', uniqueProductIds.length, 'unique products')
    const opportunityIds = await createOpportunitiesFromProducts(creator.id, uniqueProductIds)
    console.log('[Upload] Created opportunity IDs:', opportunityIds)

    // Generate tasks for each new opportunity
    for (const oppId of opportunityIds) {
      console.log('[Upload] Generating tasks for opportunity:', oppId)
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
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  } finally {
    // Clean up all temp files
    for (const tempPath of tempPaths) {
      try {
        await rm(tempPath, { force: true })
        console.log('[Upload] Cleaned up temp file:', tempPath)
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
