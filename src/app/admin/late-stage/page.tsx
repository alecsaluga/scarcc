'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge, StageBadge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight, DollarSign } from 'lucide-react'

interface Opportunity {
  id: string
  brand: string
  productName: string
  dealAmount: number | null
  stage: string
  creatorDecision: string
  creator: {
    id: string
    name: string
    slug: string
    tiktokHandle: string
  }
}

export default function LateStageKanban() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/opportunities?stage=late-stage')
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

  const negotiationDeals = opportunities.filter((o) => o.stage === 'NEGOTIATION')
  const closedDeals = opportunities.filter((o) => o.stage === 'CLOSED')

  const negotiationValue = negotiationDeals.reduce(
    (sum, o) => sum + (o.dealAmount || 0),
    0
  )
  const closedValue = closedDeals.reduce((sum, o) => sum + (o.dealAmount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Late Stage Pipeline</h1>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="purple">Negotiation</Badge>
            <span className="font-medium">{formatCurrency(negotiationValue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="green">Closed Won</Badge>
            <span className="font-medium">{formatCurrency(closedValue)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Negotiation Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Badge variant="purple">Negotiation</Badge>
              <span className="text-sm text-gray-500">
                {negotiationDeals.length} deals
              </span>
            </h2>
            <span className="text-sm font-medium text-gray-600">
              {formatCurrency(negotiationValue)}
            </span>
          </div>
          <div className="space-y-3">
            {negotiationDeals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No deals in negotiation
                </CardContent>
              </Card>
            ) : (
              negotiationDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))
            )}
          </div>
        </div>

        {/* Closed Won Column */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Badge variant="green">Closed Won</Badge>
              <span className="text-sm text-gray-500">
                {closedDeals.length} deals
              </span>
            </h2>
            <span className="text-sm font-medium text-gray-600">
              {formatCurrency(closedValue)}
            </span>
          </div>
          <div className="space-y-3">
            {closedDeals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No closed deals yet
                </CardContent>
              </Card>
            ) : (
              closedDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DealCard({ deal }: { deal: Opportunity }) {
  return (
    <Link href={`/admin/creator/${deal.creator.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{deal.brand}</h3>
              <p className="text-sm text-gray-500 truncate">{deal.productName}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-400">
                  {deal.creator.name}
                </span>
                <span className="text-xs text-gray-400">
                  @{deal.creator.tiktokHandle}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {deal.dealAmount ? (
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(deal.dealAmount)}
                </span>
              ) : (
                <span className="text-sm text-gray-400">No amount</span>
              )}
              {deal.creatorDecision !== 'PENDING' && (
                <Badge
                  variant={deal.creatorDecision === 'ACCEPTED' ? 'green' : 'red'}
                >
                  {deal.creatorDecision.toLowerCase()}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
