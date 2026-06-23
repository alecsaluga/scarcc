import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

interface VideoInput {
  url: string
  filename: string
  size: number
  contentType: string
}

// Simple upload endpoint - just saves creator + videos, no AI processing
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, tiktokHandle, email, videos } = body as {
      name: string
      tiktokHandle: string
      email: string
      videos: VideoInput[]
    }

    // Validate input
    if (!name || !tiktokHandle || !email || !videos || videos.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, tiktokHandle, email, and videos' },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${tiktokHandle.toLowerCase()}`

    // Create or find creator
    let creator = await prisma.creator.findFirst({
      where: {
        OR: [{ tiktokHandle }, { slug }],
      },
    })

    if (!creator) {
      creator = await prisma.creator.create({
        data: {
          name,
          tiktokHandle,
          slug,
          email,
        },
      })
    } else {
      // Update email if not set
      if (!creator.email && email) {
        await prisma.creator.update({
          where: { id: creator.id },
          data: { email },
        })
      }
    }

    // Save videos with PENDING_REVIEW status
    for (const video of videos) {
      // Generate file hash from URL (since we can't access the file content here)
      const fileHash = crypto.createHash('md5').update(video.url).digest('hex')

      // Check if video already exists
      const existingVideo = await prisma.uploadedVideo.findFirst({
        where: {
          creatorId: creator.id,
          blobUrl: video.url,
        },
      })

      if (!existingVideo) {
        await prisma.uploadedVideo.create({
          data: {
            creatorId: creator.id,
            filename: video.filename,
            blobUrl: video.url,
            fileHash,
            fileSize: video.size,
            mimeType: video.contentType,
            status: 'PENDING_REVIEW', // New status - awaiting manual review
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      creator: {
        id: creator.id,
        name: creator.name,
        slug: creator.slug,
      },
      videosUploaded: videos.length,
    })
  } catch (error) {
    console.error('Upload simple error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
