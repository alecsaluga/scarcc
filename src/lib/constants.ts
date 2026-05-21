// Type definitions for string-based enums (SQLite compatibility)
export type DealStage = 'ENRICHMENT' | 'OUTREACH' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2' | 'NEGOTIATION' | 'CLOSED' | 'CLOSED_LOSS'
export type TaskChannel = 'EMAIL' | 'TIKTOK_SAMPLE' | 'TIKTOK_DM' | 'INSTAGRAM_DM' | 'DISCORD' | 'LINKEDIN' | 'OTHER'
export type DeliveryStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'
export type CreatorDecision = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export const DEAL_STAGES: { value: DealStage; label: string }[] = [
  { value: 'ENRICHMENT', label: 'Enrichment' },
  { value: 'OUTREACH', label: 'Initial Outreach' },
  { value: 'FOLLOW_UP_1', label: 'Follow Up 1' },
  { value: 'FOLLOW_UP_2', label: 'Follow Up 2' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CLOSED', label: 'Closed Won' },
  { value: 'CLOSED_LOSS', label: 'Closed Loss' },
]

export const LATE_STAGES: DealStage[] = ['NEGOTIATION', 'CLOSED']

export const TASK_CHANNELS: { value: TaskChannel; label: string }[] = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'TIKTOK_SAMPLE', label: 'TikTok Sample Request' },
  { value: 'TIKTOK_DM', label: 'TikTok DM' },
  { value: 'INSTAGRAM_DM', label: 'Instagram DM' },
  { value: 'DISCORD', label: 'Discord' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'OTHER', label: 'Other' },
]

export const DELIVERY_STATUSES: { value: DeliveryStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
]

export const CREATOR_DECISIONS: { value: CreatorDecision; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
]

export const CONTACT_METHODS = [
  'Email',
  'Phone',
  'Instagram DM',
  'TikTok DM',
  'Discord',
  'LinkedIn',
  "I don't have a contact",
]

export function getStageLabel(stage: DealStage): string {
  return DEAL_STAGES.find(s => s.value === stage)?.label || stage
}

export function getChannelLabel(channel: TaskChannel | null): string {
  if (!channel) return '-'
  return TASK_CHANNELS.find(c => c.value === channel)?.label || channel
}

export function getDeliveryStatusLabel(status: DeliveryStatus): string {
  return DELIVERY_STATUSES.find(s => s.value === status)?.label || status
}

export function getCreatorDecisionLabel(decision: CreatorDecision): string {
  return CREATOR_DECISIONS.find(d => d.value === decision)?.label || decision
}

// Default workflow tasks for new opportunities
export const DEFAULT_TASKS = [
  { title: 'Enrich product link', stage: 'ENRICHMENT' as DealStage, channel: null, daysFromCreation: 0 },
  { title: 'Identify brand', stage: 'ENRICHMENT' as DealStage, channel: null, daysFromCreation: 0 },
  { title: 'Outreach via Email', stage: 'OUTREACH' as DealStage, channel: 'EMAIL' as TaskChannel, daysFromCreation: 1 },
  { title: 'Outreach via TikTok Sample Request', stage: 'OUTREACH' as DealStage, channel: 'TIKTOK_SAMPLE' as TaskChannel, daysFromCreation: 1 },
  { title: 'Outreach via TikTok DM', stage: 'OUTREACH' as DealStage, channel: 'TIKTOK_DM' as TaskChannel, daysFromCreation: 1 },
  { title: 'Outreach via Instagram DM', stage: 'OUTREACH' as DealStage, channel: 'INSTAGRAM_DM' as TaskChannel, daysFromCreation: 1 },
  { title: 'Outreach via Discord', stage: 'OUTREACH' as DealStage, channel: 'DISCORD' as TaskChannel, daysFromCreation: 1 },
  { title: 'Outreach via LinkedIn', stage: 'OUTREACH' as DealStage, channel: 'LINKEDIN' as TaskChannel, daysFromCreation: 1 },
  { title: 'Follow-up 1 via Email', stage: 'FOLLOW_UP_1' as DealStage, channel: 'EMAIL' as TaskChannel, daysFromCreation: 3 },
  { title: 'Follow-up 1 via TikTok DM', stage: 'FOLLOW_UP_1' as DealStage, channel: 'TIKTOK_DM' as TaskChannel, daysFromCreation: 3 },
  { title: 'Follow-up 1 via Instagram DM', stage: 'FOLLOW_UP_1' as DealStage, channel: 'INSTAGRAM_DM' as TaskChannel, daysFromCreation: 3 },
  { title: 'Follow-up 2 via Email', stage: 'FOLLOW_UP_2' as DealStage, channel: 'EMAIL' as TaskChannel, daysFromCreation: 5 },
  { title: 'Follow-up 2 via TikTok DM', stage: 'FOLLOW_UP_2' as DealStage, channel: 'TIKTOK_DM' as TaskChannel, daysFromCreation: 5 },
  { title: 'Follow-up 2 via Instagram DM', stage: 'FOLLOW_UP_2' as DealStage, channel: 'INSTAGRAM_DM' as TaskChannel, daysFromCreation: 5 },
]
