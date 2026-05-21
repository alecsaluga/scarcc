'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, DueIndicator } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'

interface DashboardStats {
  inProgressDeals: number
  pipelineValue: number
  closedRevenue: number
  totalDealValue: number
  commissionPipeline: number
  commissionClosed: number
  winRate: number
  totalCreators: number
  closedWonCount: number
  closedLossCount: number
  inProgressDelivery: number
  completeDelivery: number
  dueNowTaskCount: number
}

interface RecentTask {
  id: string
  title: string
  dueDate: string
  creatorName: string
  creatorSlug: string
  brand: string
}

interface Creator {
  id: string
  name: string
  tiktokHandle: string
  slug: string
  email: string | null
  onboardingComplete: boolean
  stats: {
    activeDeals: number
    pipelineValue: number
    closedWonValue: number
    winRate: number
  }
  dueNowCount: number
}

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState('all')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [statsRes, creatorsRes] = await Promise.all([
          fetch(`/api/dashboard/stats?timeRange=${timeRange}`),
          fetch(`/api/creators?timeRange=${timeRange}`),
        ])

        const statsData = await statsRes.json()
        const creatorsData = await creatorsRes.json()

        setStats(statsData.stats)
        setRecentTasks(statsData.recentTasks)
        setCreators(creatorsData.creators)
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          options={[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
            { value: 'all', label: 'All time' },
          ]}
          className="w-40"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.inProgressDeals || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.pipelineValue || 0)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(stats?.commissionPipeline || 0)} commission
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Closed Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats?.closedRevenue || 0)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(stats?.commissionClosed || 0)} commission
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.winRate || 0}%
                </p>
                <p className="text-sm text-gray-500">
                  {stats?.closedWonCount || 0} won / {stats?.closedLossCount || 0} lost
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Creators</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.totalCreators || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Due Now</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.dueNowTaskCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Progress</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.completeDelivery || 0} / {(stats?.inProgressDelivery || 0) + (stats?.completeDelivery || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Due Now Tasks */}
      {recentTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Tasks Due Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-200">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      {task.creatorName} - {task.brand}
                    </p>
                  </div>
                  <Link href={`/admin/creator/${task.creatorSlug}`}>
                    <Button size="sm" variant="ghost">
                      View <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Creator Directory */}
      <Card>
        <CardHeader>
          <CardTitle>Creators</CardTitle>
        </CardHeader>
        <CardContent>
          {creators.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No creators yet. Send them to the upload page to get started.
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {creators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/admin/creator/${creator.slug}`}
                  className="py-4 flex items-center justify-between hover:bg-gray-50 -mx-6 px-6 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center">
                      <span className="text-brand-600 font-semibold">
                        {creator.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{creator.name}</p>
                        <DueIndicator count={creator.dueNowCount} />
                      </div>
                      <p className="text-sm text-gray-500">@{creator.tiktokHandle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {creator.stats.activeDeals} active
                      </p>
                      <p className="text-gray-500">
                        {formatCurrency(creator.stats.pipelineValue)} pipeline
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {formatCurrency(creator.stats.closedWonValue)} closed
                      </p>
                      <p className="text-gray-500">{creator.stats.winRate}% win rate</p>
                    </div>
                    {!creator.onboardingComplete && (
                      <Badge variant="yellow">Onboarding</Badge>
                    )}
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
