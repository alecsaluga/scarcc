import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import slugify from 'slugify'
import CryptoJS from 'crypto-js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string, handle: string): string {
  const base = `${name}-${handle}`.toLowerCase()
  return slugify(base, { strict: true, lower: true })
}

export function generateFileHash(buffer: ArrayBuffer): string {
  const wordArray = CryptoJS.lib.WordArray.create(buffer as unknown as number[])
  return CryptoJS.SHA256(wordArray).toString()
}

export function generateProductHash(creatorId: string, productName: string): string {
  const normalized = productName.toLowerCase().trim().replace(/\s+/g, ' ')
  return CryptoJS.SHA256(`${creatorId}:${normalized}`).toString()
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('en-US').format(num)
}

export function getCommissionRate(): number {
  return parseFloat(process.env.COMMISSION_RATE || '0.30')
}

export function calculateCommission(amount: number): number {
  return amount * getCommissionRate()
}

export function parseDealAmount(value: string): number | null {
  // Remove any dollar signs, commas, spaces
  const cleaned = value.replace(/[$,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

// Date helpers
export function isOverdue(date: Date): boolean {
  return new Date(date) < new Date()
}

export function isDueWithinDays(date: Date, days: number): boolean {
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  const dueDate = new Date(date)
  return dueDate <= futureDate && dueDate >= now
}

export function isDueSoon(date: Date): boolean {
  // Due within 2 days or overdue
  return isOverdue(date) || isDueWithinDays(date, 2)
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Time range filter helpers
export type TimeRange = '7d' | '30d' | '90d' | 'all'

export function getDateRangeStart(range: TimeRange): Date | null {
  if (range === 'all') return null

  const now = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
