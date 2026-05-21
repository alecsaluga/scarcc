import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createManualTask } from '@/lib/task-service'
import { addDays } from '@/lib/utils'
import type { DealStage, TaskChannel } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const opportunityId = searchParams.get('opportunityId')
    const view = searchParams.get('view') // 'due-now', 'upcoming', 'all'
    const completed = searchParams.get('completed')

    const now = new Date()
    const twoDaysFromNow = addDays(now, 2)

    const where: Record<string, unknown> = {}

    if (opportunityId) {
      where.opportunityId = opportunityId
    }

    if (view === 'due-now') {
      where.dueDate = { lte: twoDaysFromNow }
    } else if (view === 'upcoming') {
      where.dueDate = { gt: twoDaysFromNow }
    }

    if (completed === 'true') {
      where.completed = true
    } else if (completed === 'false') {
      where.completed = false
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        opportunity: {
          include: {
            creator: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { opportunityId, title, dueDate, stage, channel } = body

    if (!opportunityId || !title || !dueDate || !stage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await createManualTask(
      opportunityId,
      title,
      new Date(dueDate),
      stage as DealStage,
      channel as TaskChannel | undefined
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
