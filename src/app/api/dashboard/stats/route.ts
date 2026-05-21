import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCommissionRate, getDateRangeStart, type TimeRange } from '@/lib/utils'
import { getAllDueNowTasks } from '@/lib/task-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = (searchParams.get('timeRange') || 'all') as TimeRange
    const dateStart = getDateRangeStart(timeRange)

    const commissionRate = getCommissionRate()

    // Get all opportunities within time range
    const opportunities = await prisma.opportunity.findMany({
      where: dateStart ? { createdAt: { gte: dateStart } } : undefined,
    })

    // Calculate stats
    const activeOpportunities = opportunities.filter(o =>
      !['CLOSED', 'CLOSED_LOSS'].includes(o.stage)
    )

    const closedWonOpportunities = opportunities.filter(o => o.stage === 'CLOSED')
    const closedLossOpportunities = opportunities.filter(o => o.stage === 'CLOSED_LOSS')
    const allClosedOpportunities = [...closedWonOpportunities, ...closedLossOpportunities]

    const pipelineValue = activeOpportunities.reduce(
      (sum, o) => sum + (o.dealAmount || 0),
      0
    )

    const closedRevenue = closedWonOpportunities.reduce(
      (sum, o) => sum + (o.dealAmount || 0),
      0
    )

    const totalDealValue = opportunities.reduce(
      (sum, o) => sum + (o.dealAmount || 0),
      0
    )

    const commissionPipeline = pipelineValue * commissionRate
    const commissionClosed = closedRevenue * commissionRate

    const winRate = allClosedOpportunities.length > 0
      ? (closedWonOpportunities.length / allClosedOpportunities.length) * 100
      : 0

    // Delivery progress
    const inProgressDelivery = closedWonOpportunities.filter(
      o => o.deliveryStatus === 'IN_PROGRESS'
    ).length

    const completeDelivery = closedWonOpportunities.filter(
      o => o.deliveryStatus === 'COMPLETE'
    ).length

    // Total creators
    const totalCreators = await prisma.creator.count()

    // Due-now tasks
    const dueNowTasks = await getAllDueNowTasks()

    return NextResponse.json({
      stats: {
        inProgressDeals: activeOpportunities.length,
        pipelineValue,
        closedRevenue,
        totalDealValue,
        commissionPipeline,
        commissionClosed,
        winRate: Math.round(winRate),
        totalCreators,
        closedWonCount: closedWonOpportunities.length,
        closedLossCount: closedLossOpportunities.length,
        inProgressDelivery,
        completeDelivery,
        dueNowTaskCount: dueNowTasks.length,
      },
      recentTasks: dueNowTasks.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        creatorName: t.opportunity.creator.name,
        creatorSlug: t.opportunity.creator.slug,
        brand: t.opportunity.brand,
      })),
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
