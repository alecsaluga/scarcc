import { prisma } from './db'
import { DEFAULT_TASKS } from './constants'
import { addDays } from './utils'
import type { DealStage, TaskChannel } from './constants'

export async function generateTasksForOpportunity(opportunityId: string): Promise<void> {
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  })

  if (!opportunity) {
    throw new Error('Opportunity not found')
  }

  const now = new Date()
  const tasks = DEFAULT_TASKS.map(task => ({
    opportunityId,
    title: task.title,
    stage: task.stage,
    channel: task.channel,
    dueDate: addDays(now, task.daysFromCreation),
    completed: false,
    isManual: false,
  }))

  await prisma.task.createMany({
    data: tasks,
  })
}

export async function createManualTask(
  opportunityId: string,
  title: string,
  dueDate: Date,
  stage: DealStage,
  channel?: TaskChannel
): Promise<void> {
  await prisma.task.create({
    data: {
      opportunityId,
      title,
      dueDate,
      stage,
      channel: channel || null,
      isManual: true,
      completed: false,
    },
  })
}

export async function completeTask(taskId: string): Promise<void> {
  await prisma.task.update({
    where: { id: taskId },
    data: {
      completed: true,
      completedAt: new Date(),
    },
  })
}

export async function uncompleteTask(taskId: string): Promise<void> {
  await prisma.task.update({
    where: { id: taskId },
    data: {
      completed: false,
      completedAt: null,
    },
  })
}

export async function deleteTask(taskId: string): Promise<void> {
  await prisma.task.delete({
    where: { id: taskId },
  })
}

// Get tasks for opportunity, organized by due status
export async function getTasksForOpportunity(opportunityId: string) {
  const tasks = await prisma.task.findMany({
    where: { opportunityId },
    orderBy: { dueDate: 'asc' },
  })

  const now = new Date()
  const twoDaysFromNow = addDays(now, 2)

  return {
    dueNow: tasks.filter(t => !t.completed && new Date(t.dueDate) <= twoDaysFromNow),
    upcoming: tasks.filter(t => !t.completed && new Date(t.dueDate) > twoDaysFromNow),
    completed: tasks.filter(t => t.completed),
  }
}

// Get all due-now tasks across all opportunities
export async function getAllDueNowTasks() {
  const twoDaysFromNow = addDays(new Date(), 2)

  return prisma.task.findMany({
    where: {
      completed: false,
      dueDate: { lte: twoDaysFromNow },
    },
    include: {
      opportunity: {
        include: {
          creator: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })
}

// Get count of due-now tasks per creator
export async function getDueNowCountsByCreator(): Promise<Record<string, number>> {
  const twoDaysFromNow = addDays(new Date(), 2)

  const tasks = await prisma.task.findMany({
    where: {
      completed: false,
      dueDate: { lte: twoDaysFromNow },
    },
    include: {
      opportunity: true,
    },
  })

  const counts: Record<string, number> = {}
  for (const task of tasks) {
    const creatorId = task.opportunity.creatorId
    counts[creatorId] = (counts[creatorId] || 0) + 1
  }

  return counts
}

// Get count of due-now tasks per opportunity
export async function getDueNowCountsByOpportunity(): Promise<Record<string, number>> {
  const twoDaysFromNow = addDays(new Date(), 2)

  const tasks = await prisma.task.findMany({
    where: {
      completed: false,
      dueDate: { lte: twoDaysFromNow },
    },
  })

  const counts: Record<string, number> = {}
  for (const task of tasks) {
    counts[task.opportunityId] = (counts[task.opportunityId] || 0) + 1
  }

  return counts
}
