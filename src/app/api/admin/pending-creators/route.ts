import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Get all creators with pending review videos
export async function GET() {
  try {
    console.log('Fetching pending creators...')

    const creators = await prisma.creator.findMany({
      where: {
        uploadedVideos: {
          some: {
            status: 'PENDING_REVIEW',
          },
        },
      },
      include: {
        uploadedVideos: {
          orderBy: { createdAt: 'desc' },
        },
        opportunities: {
          include: {
            extractedProduct: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log('Found creators with pending videos:', creators.length)

    // Also get standalone extracted products (not linked to opportunities yet)
    const creatorsWithProducts = await Promise.all(
      creators.map(async (creator) => {
        const extractedProducts = await prisma.extractedProduct.findMany({
          where: {
            video: {
              creatorId: creator.id,
            },
          },
          select: {
            id: true,
            brandName: true,
            productName: true,
            gmv: true,
            itemsSold: true,
          },
        })

        return {
          id: creator.id,
          name: creator.name,
          tiktokHandle: creator.tiktokHandle,
          slug: creator.slug,
          email: creator.email,
          createdAt: creator.createdAt,
          videos: creator.uploadedVideos.map((v) => ({
            id: v.id,
            filename: v.filename,
            blobUrl: v.blobUrl,
            fileSize: v.fileSize,
            status: v.status,
            createdAt: v.createdAt,
          })),
          extractedProducts,
        }
      })
    )

    return NextResponse.json({ creators: creatorsWithProducts })
  } catch (error) {
    console.error('Error fetching pending creators:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending creators' },
      { status: 500 }
    )
  }
}
