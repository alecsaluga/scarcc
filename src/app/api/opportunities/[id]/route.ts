import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { DealStage, DeliveryStatus, CreatorDecision } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        creator: true,
        extractedProduct: true,
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    })

    if (!opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error('Error fetching opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      brand,
      tiktokShopLink,
      dealAmount,
      bestContact,
      bestContactMethod,
      stage,
      creatorDecision,
      deliveryStatus,
      videosCommitted,
      videosDelivered,
      deliveryNotes,
      notes,
    } = body

    const updateData: Record<string, unknown> = {}

    if (brand !== undefined) updateData.brand = brand
    if (tiktokShopLink !== undefined) updateData.tiktokShopLink = tiktokShopLink
    if (dealAmount !== undefined) updateData.dealAmount = dealAmount
    if (bestContact !== undefined) updateData.bestContact = bestContact
    if (bestContactMethod !== undefined) updateData.bestContactMethod = bestContactMethod
    if (stage !== undefined) updateData.stage = stage as DealStage
    if (creatorDecision !== undefined) updateData.creatorDecision = creatorDecision as CreatorDecision
    if (deliveryStatus !== undefined) updateData.deliveryStatus = deliveryStatus as DeliveryStatus
    if (videosCommitted !== undefined) updateData.videosCommitted = videosCommitted
    if (videosDelivered !== undefined) updateData.videosDelivered = videosDelivered
    if (deliveryNotes !== undefined) updateData.deliveryNotes = deliveryNotes
    if (notes !== undefined) updateData.notes = notes

    // If closing the deal, set closedAt
    if (stage === 'CLOSED' || stage === 'CLOSED_LOSS') {
      const existing = await prisma.opportunity.findUnique({ where: { id } })
      if (existing && !existing.closedAt) {
        updateData.closedAt = new Date()
      }
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        creator: true,
        extractedProduct: true,
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    })

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to update opportunity' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.opportunity.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting opportunity:', error)
    return NextResponse.json(
      { error: 'Failed to delete opportunity' },
      { status: 500 }
    )
  }
}
