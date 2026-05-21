import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { CreatorDecision, DeliveryStatus } from '@/lib/constants'

// Get creator-facing deals (only real deals to show)
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

    // Only show deals that are "real" - have amount, in negotiation, closed, or decision made
    const deals = await prisma.opportunity.findMany({
      where: {
        creatorId: creator.id,
        OR: [
          { dealAmount: { not: null, gt: 0 } },
          { stage: { in: ['NEGOTIATION', 'CLOSED'] } },
          { creatorDecision: { not: 'PENDING' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ deals })
  } catch (error) {
    console.error('Error fetching portal deals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    )
  }
}

// Update deal from creator portal (accept/decline, delivery updates)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const {
      dealId,
      creatorDecision,
      deliveryStatus,
      videosDelivered,
      deliveryNotes,
    } = body

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
    const deal = await prisma.opportunity.findFirst({
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

    const updateData: Record<string, unknown> = {}

    if (creatorDecision !== undefined) {
      updateData.creatorDecision = creatorDecision as CreatorDecision
    }
    if (deliveryStatus !== undefined) {
      updateData.deliveryStatus = deliveryStatus as DeliveryStatus
    }
    if (videosDelivered !== undefined) {
      updateData.videosDelivered = videosDelivered
    }
    if (deliveryNotes !== undefined) {
      updateData.deliveryNotes = deliveryNotes
    }

    const updatedDeal = await prisma.opportunity.update({
      where: { id: dealId },
      data: updateData,
    })

    return NextResponse.json({ deal: updatedDeal })
  } catch (error) {
    console.error('Error updating deal:', error)
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    )
  }
}
