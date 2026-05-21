'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle, Clock, PlayCircle } from 'lucide-react'

interface Opportunity {
  id: string
  brand: string
  productName: string
  dealAmount: number | null
  stage: string
  deliveryStatus: string
  videosCommitted: number
  videosDelivered: number
  deliveryNotes: string | null
  creator: {
    id: string
    name: string
    slug: string
    tiktokHandle: string
  }
}

export default function ClosedDeliveryKanban() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/opportunities?stage=closed-delivery')
        const data = await response.json()
        setOpportunities(data.opportunities)
      } catch (err) {
        console.error('Failed to load opportunities:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  // Group by delivery status, also consider complete if all videos delivered
  const notStarted = opportunities.filter(
    (o) => o.deliveryStatus === 'NOT_STARTED'
  )
  const inProgress = opportunities.filter(
    (o) =>
      o.deliveryStatus === 'IN_PROGRESS' ||
      (o.deliveryStatus !== 'COMPLETE' &&
        o.videosDelivered > 0 &&
        o.videosDelivered < o.videosCommitted)
  )
  const complete = opportunities.filter(
    (o) =>
      o.deliveryStatus === 'COMPLETE' ||
      (o.videosCommitted > 0 && o.videosDelivered >= o.videosCommitted)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {complete.length} of {opportunities.length} complete
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Not Started Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              Not Started
              <span className="text-sm text-gray-500 font-normal">
                ({notStarted.length})
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {notStarted.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No pending deliveries
                </CardContent>
              </Card>
            ) : (
              notStarted.map((deal) => (
                <DeliveryCard key={deal.id} deal={deal} />
              ))
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-yellow-500" />
              In Progress
              <span className="text-sm text-gray-500 font-normal">
                ({inProgress.length})
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {inProgress.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No deliveries in progress
                </CardContent>
              </Card>
            ) : (
              inProgress.map((deal) => (
                <DeliveryCard key={deal.id} deal={deal} />
              ))
            )}
          </div>
        </div>

        {/* Complete Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Complete
              <span className="text-sm text-gray-500 font-normal">
                ({complete.length})
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {complete.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No completed deliveries
                </CardContent>
              </Card>
            ) : (
              complete.map((deal) => (
                <DeliveryCard key={deal.id} deal={deal} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DeliveryCard({ deal }: { deal: Opportunity }) {
  const isComplete =
    deal.deliveryStatus === 'COMPLETE' ||
    (deal.videosCommitted > 0 && deal.videosDelivered >= deal.videosCommitted)

  return (
    <Link href={`/admin/creator/${deal.creator.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{deal.brand}</h3>
                <p className="text-sm text-gray-500">{deal.creator.name}</p>
              </div>
              {deal.dealAmount && (
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(deal.dealAmount)}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Videos</span>
                <span
                  className={`font-medium ${isComplete ? 'text-green-600' : 'text-gray-900'}`}
                >
                  {deal.videosDelivered} / {deal.videosCommitted}
                </span>
              </div>
              <ProgressBar
                value={deal.videosDelivered}
                max={deal.videosCommitted || 1}
                showLabel={false}
              />
            </div>

            {deal.deliveryNotes && (
              <p className="text-xs text-gray-500 line-clamp-2">
                {deal.deliveryNotes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
