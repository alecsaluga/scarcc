import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getDateRangeStart, type TimeRange } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage')
    const creatorId = searchParams.get('creatorId')
    const timeRange = (searchParams.get('timeRange') || 'all') as TimeRange
    const dateStart = getDateRangeStart(timeRange)

    const where: Record<string, unknown> = {}

    if (stage) {
      if (stage === 'late-stage') {
        where.stage = { in: ['NEGOTIATION', 'CLOSED'] }
      } else if (stage === 'closed-delivery') {
        where.stage = 'CLOSED'
      } else {
        where.stage = stage
      }
    }

    if (creatorId) {
      where.creatorId = creatorId
    }

    if (dateStart) {
      where.createdAt = { gte: dateStart }
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        creator: true,
        extractedProduct: true,
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ opportunities })
  } catch (error) {
    console.error('Error fetching opportunities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}
