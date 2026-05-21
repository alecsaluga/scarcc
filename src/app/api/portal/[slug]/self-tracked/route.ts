import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Get creator's self-tracked deals
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const creator = await prisma.creator.findUnique({
      where: { slug },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    const selfTrackedDeals = await prisma.selfTrackedDeal.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ deals: selfTrackedDeals })
  } catch (error) {
    console.error('Error fetching self-tracked deals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch self-tracked deals' },
      { status: 500 }
    )
  }
}

// Create self-tracked deal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { brandName, monthlyVideosRequired } = body

    const creator = await prisma.creator.findUnique({
      where: { slug },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    const deal = await prisma.selfTrackedDeal.create({
      data: {
        creatorId: creator.id,
        brandName,
        monthlyVideosRequired: monthlyVideosRequired || 0,
        completedVideos: 0,
      },
    })

    return NextResponse.json({ deal })
  } catch (error) {
    console.error('Error creating self-tracked deal:', error)
    return NextResponse.json(
      { error: 'Failed to create self-tracked deal' },
      { status: 500 }
    )
  }
}

// Update or delete self-tracked deal
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { dealId, action, completedVideos, monthlyVideosRequired } = body

    const creator = await prisma.creator.findUnique({
      where: { slug },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Verify deal belongs to this creator
    const deal = await prisma.selfTrackedDeal.findFirst({
      where: {
        id: dealId,
        creatorId: creator.id,
      },
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    if (action === 'increment') {
      const updatedDeal = await prisma.selfTrackedDeal.update({
        where: { id: dealId },
        data: {
          completedVideos: {
            increment: 1,
          },
        },
      })
      return NextResponse.json({ deal: updatedDeal })
    }

    if (action === 'reset') {
      const updatedDeal = await prisma.selfTrackedDeal.update({
        where: { id: dealId },
        data: { completedVideos: 0 },
      })
      return NextResponse.json({ deal: updatedDeal })
    }

    if (action === 'delete') {
      await prisma.selfTrackedDeal.delete({
        where: { id: dealId },
      })
      return NextResponse.json({ success: true })
    }

    // General update
    const updateData: Record<string, unknown> = {}
    if (completedVideos !== undefined) updateData.completedVideos = completedVideos
    if (monthlyVideosRequired !== undefined) updateData.monthlyVideosRequired = monthlyVideosRequired

    const updatedDeal = await prisma.selfTrackedDeal.update({
      where: { id: dealId },
      data: updateData,
    })

    return NextResponse.json({ deal: updatedDeal })
  } catch (error) {
    console.error('Error updating self-tracked deal:', error)
    return NextResponse.json(
      { error: 'Failed to update self-tracked deal' },
      { status: 500 }
    )
  }
}
