import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDueNowCountsByCreator } from '@/lib/task-service'
import { getDateRangeStart, type TimeRange } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = (searchParams.get('timeRange') || 'all') as TimeRange
    const dateStart = getDateRangeStart(timeRange)

    const creators = await prisma.creator.findMany({
      include: {
        opportunities: {
          where: dateStart ? { createdAt: { gte: dateStart } } : undefined,
        },
        portalCredential: {
          select: {
            onboardingComplete: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get due-now task counts
    const dueNowCounts = await getDueNowCountsByCreator()

    const creatorsWithStats = creators.map(creator => {
      const opportunities = creator.opportunities

      // Calculate stats
      const activeDeals = opportunities.filter(o =>
        !['CLOSED', 'CLOSED_LOSS'].includes(o.stage)
      ).length

      const pipelineValue = opportunities
        .filter(o => !['CLOSED', 'CLOSED_LOSS'].includes(o.stage))
        .reduce((sum, o) => sum + (o.dealAmount || 0), 0)

      const closedWonValue = opportunities
        .filter(o => o.stage === 'CLOSED')
        .reduce((sum, o) => sum + (o.dealAmount || 0), 0)

      const closedLossCount = opportunities.filter(o => o.stage === 'CLOSED_LOSS').length
      const totalClosed = opportunities.filter(o =>
        ['CLOSED', 'CLOSED_LOSS'].includes(o.stage)
      ).length

      const winRate = totalClosed > 0
        ? (opportunities.filter(o => o.stage === 'CLOSED').length / totalClosed) * 100
        : 0

      return {
        id: creator.id,
        name: creator.name,
        tiktokHandle: creator.tiktokHandle,
        slug: creator.slug,
        email: creator.email,
        createdAt: creator.createdAt,
        onboardingComplete: creator.portalCredential?.onboardingComplete || false,
        stats: {
          activeDeals,
          pipelineValue,
          closedWonValue,
          closedLossCount,
          winRate: Math.round(winRate),
        },
        dueNowCount: dueNowCounts[creator.id] || 0,
      }
    })

    return NextResponse.json({ creators: creatorsWithStats })
  } catch (error) {
    console.error('Error fetching creators:', error)
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    )
  }
}
