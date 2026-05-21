'use client'

import { cn } from '@/lib/utils'
import type { DealStage } from '@/lib/constants'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

export function Badge({ className, variant = 'gray', ...props }: BadgeProps) {
  const variants = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

// Stage-specific badge
interface StageBadgeProps {
  stage: DealStage
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  const stageConfig: Record<DealStage, { label: string; variant: BadgeProps['variant'] }> = {
    ENRICHMENT: { label: 'Enrichment', variant: 'gray' },
    OUTREACH: { label: 'Outreach', variant: 'blue' },
    FOLLOW_UP_1: { label: 'Follow-up 1', variant: 'yellow' },
    FOLLOW_UP_2: { label: 'Follow-up 2', variant: 'yellow' },
    NEGOTIATION: { label: 'Negotiation', variant: 'purple' },
    CLOSED: { label: 'Closed Won', variant: 'green' },
    CLOSED_LOSS: { label: 'Closed Loss', variant: 'red' },
  }

  const config = stageConfig[stage]

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}

// Due indicator badge
interface DueIndicatorProps {
  count: number
  className?: string
}

export function DueIndicator({ count, className }: DueIndicatorProps) {
  if (count === 0) return null

  return (
    <Badge variant="red" className={cn('ml-2', className)}>
      {count} due
    </Badge>
  )
}
