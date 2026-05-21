import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDueNowCountsByOpportunity } from '@/lib/task-service'
import { getCommissionRate } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const creator = await prisma.creator.findUnique({
      where: { slug },
      include: {
        opportunities: {
          include: {
            extractedProduct: true,
            tasks: {
              orderBy: { dueDate: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        brandOnboardings: true,
        portalCredential: {
          select: {
            onboardingStep: true,
            onboardingComplete: true,
          },
        },
        uploadedVideos: {
          include: {
            extractedProducts: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Get due-now counts per opportunity
    const dueNowCounts = await getDueNowCountsByOpportunity()

    // Calculate creator-level stats
    const opportunities = creator.opportunities
    const commissionRate = getCommissionRate()

    const stats = {
      totalOpportunities: opportunities.length,
      activeDeals: opportunities.filter(o =>
        !['CLOSED', 'CLOSED_LOSS'].includes(o.stage)
      ).length,
      pipelineValue: opportunities
        .filter(o => !['CLOSED', 'CLOSED_LOSS'].includes(o.stage))
        .reduce((sum, o) => sum + (o.dealAmount || 0), 0),
      closedWonValue: opportunities
        .filter(o => o.stage === 'CLOSED')
        .reduce((sum, o) => sum + (o.dealAmount || 0), 0),
      closedLossCount: opportunities.filter(o => o.stage === 'CLOSED_LOSS').length,
      commissionPipeline: opportunities
        .filter(o => !['CLOSED', 'CLOSED_LOSS'].includes(o.stage))
        .reduce((sum, o) => sum + (o.dealAmount || 0) * commissionRate, 0),
      commissionClosed: opportunities
        .filter(o => o.stage === 'CLOSED')
        .reduce((sum, o) => sum + (o.dealAmount || 0) * commissionRate, 0),
    }

    // Enhance opportunities with due-now counts
    const opportunitiesWithCounts = opportunities.map(opp => ({
      ...opp,
      dueNowCount: dueNowCounts[opp.id] || 0,
    }))

    return NextResponse.json({
      creator: {
        id: creator.id,
        name: creator.name,
        tiktokHandle: creator.tiktokHandle,
        slug: creator.slug,
        email: creator.email,
        createdAt: creator.createdAt,
        onboardingStep: creator.portalCredential?.onboardingStep || 1,
        onboardingComplete: creator.portalCredential?.onboardingComplete || false,
      },
      stats,
      opportunities: opportunitiesWithCounts,
      brandOnboardings: creator.brandOnboardings,
      videos: creator.uploadedVideos,
    })
  } catch (error) {
    console.error('Error fetching creator:', error)
    return NextResponse.json(
      { error: 'Failed to fetch creator' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { confirmName } = body

    const creator = await prisma.creator.findUnique({
      where: { slug },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Verify confirmation
    if (confirmName !== creator.name) {
      return NextResponse.json(
        { error: 'Confirmation name does not match' },
        { status: 400 }
      )
    }

    // Delete creator (cascades to all related records)
    await prisma.creator.delete({
      where: { slug },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting creator:', error)
    return NextResponse.json(
      { error: 'Failed to delete creator' },
      { status: 500 }
    )
  }
}
