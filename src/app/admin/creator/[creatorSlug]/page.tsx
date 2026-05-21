'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge, StageBadge, DueIndicator } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { formatCurrency, isDueSoon } from '@/lib/utils'
import { DEAL_STAGES, DELIVERY_STATUSES, CREATOR_DECISIONS, TASK_CHANNELS } from '@/lib/constants'
import {
  ArrowLeft,
  ExternalLink,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  channel: string | null
  stage: string
  dueDate: string
  completed: boolean
  isManual: boolean
}

interface Opportunity {
  id: string
  brand: string
  productName: string
  tiktokShopLink: string | null
  dealAmount: number | null
  bestContact: string | null
  bestContactMethod: string | null
  stage: string
  creatorDecision: string
  deliveryStatus: string
  videosCommitted: number
  videosDelivered: number
  deliveryNotes: string | null
  notes: string | null
  dueNowCount: number
  tasks: Task[]
  extractedProduct?: {
    gmv: number
    itemsSold: number
    confidence: number
  }
}

interface CreatorData {
  creator: {
    id: string
    name: string
    tiktokHandle: string
    slug: string
    email: string | null
    onboardingComplete: boolean
  }
  stats: {
    totalOpportunities: number
    activeDeals: number
    pipelineValue: number
    closedWonValue: number
    closedLossCount: number
    commissionPipeline: number
    commissionClosed: number
  }
  opportunities: Opportunity[]
}

export default function CreatorWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const creatorSlug = params.creatorSlug as string

  const [data, setData] = useState<CreatorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [taskView, setTaskView] = useState<'due' | 'upcoming'>('due')
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    dueDate: '',
    stage: 'OUTREACH',
    channel: '',
  })

  async function loadData() {
    try {
      const response = await fetch(`/api/creators/${creatorSlug}`)
      if (!response.ok) throw new Error('Creator not found')
      const result = await response.json()
      setData(result)
      if (result.opportunities.length > 0 && !selectedOpp) {
        setSelectedOpp(result.opportunities[0].id)
      }
    } catch (err) {
      console.error('Failed to load creator:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [creatorSlug])

  async function updateOpportunity(oppId: string, updates: Partial<Opportunity>) {
    try {
      await fetch(`/api/opportunities/${oppId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      loadData()
    } catch (err) {
      console.error('Failed to update opportunity:', err)
    }
  }

  async function toggleTask(taskId: string, completed: boolean) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      loadData()
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  async function createTask() {
    if (!selectedOpp || !newTask.title || !newTask.dueDate) return

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: selectedOpp,
          ...newTask,
          channel: newTask.channel || null,
        }),
      })
      setShowNewTask(false)
      setNewTask({ title: '', dueDate: '', stage: 'OUTREACH', channel: '' })
      loadData()
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  async function deleteCreator() {
    if (!data || deleteConfirmName !== data.creator.name) return

    try {
      await fetch(`/api/creators/${creatorSlug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: deleteConfirmName }),
      })
      router.push('/admin')
    } catch (err) {
      console.error('Failed to delete creator:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Creator not found</p>
        <Link href="/admin">
          <Button className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const selectedOpportunity = data.opportunities.find((o) => o.id === selectedOpp)

  const dueNowTasks =
    selectedOpportunity?.tasks.filter(
      (t) => !t.completed && isDueSoon(new Date(t.dueDate))
    ) || []

  const upcomingTasks =
    selectedOpportunity?.tasks.filter(
      (t) => !t.completed && !isDueSoon(new Date(t.dueDate))
    ) || []

  const completedTasks =
    selectedOpportunity?.tasks.filter((t) => t.completed) || []

  const displayTasks = taskView === 'due' ? dueNowTasks : upcomingTasks

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.creator.name}</h1>
            <p className="text-gray-500">@{data.creator.tiktokHandle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/portal/${data.creator.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:text-brand-700 text-sm flex items-center gap-1"
          >
            Portal <ExternalLink className="h-4 w-4" />
          </a>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Active Deals</p>
            <p className="text-2xl font-bold">{data.stats.activeDeals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Pipeline Value</p>
            <p className="text-2xl font-bold">{formatCurrency(data.stats.pipelineValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Closed Revenue</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(data.stats.closedWonValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600">Commission (Closed)</p>
            <p className="text-2xl font-bold">
              {formatCurrency(data.stats.commissionClosed)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opportunities List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Opportunities ({data.opportunities.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {data.opportunities.map((opp) => (
                <button
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp.id)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedOpp === opp.id ? 'bg-brand-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {opp.brand}
                    </span>
                    <DueIndicator count={opp.dueNowCount} />
                  </div>
                  <p className="text-sm text-gray-500 truncate">{opp.productName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <StageBadge stage={opp.stage as any} />
                    {opp.dealAmount && (
                      <span className="text-sm font-medium">
                        {formatCurrency(opp.dealAmount)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deal Editor */}
        <Card className="lg:col-span-2">
          {selectedOpportunity ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Deal Details</CardTitle>
                  <StageBadge stage={selectedOpportunity.stage as any} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Extracted Product Info */}
                {selectedOpportunity.extractedProduct && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-600">
                      Extracted GMV: {formatCurrency(selectedOpportunity.extractedProduct.gmv)} |
                      Items Sold: {selectedOpportunity.extractedProduct.itemsSold} |
                      Confidence: {Math.round(selectedOpportunity.extractedProduct.confidence * 100)}%
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Brand"
                    value={selectedOpportunity.brand}
                    onChange={(e) =>
                      updateOpportunity(selectedOpportunity.id, { brand: e.target.value })
                    }
                    onBlur={(e) =>
                      updateOpportunity(selectedOpportunity.id, { brand: e.target.value })
                    }
                  />
                  <Input
                    label="TikTok Shop Link"
                    value={selectedOpportunity.tiktokShopLink || ''}
                    onChange={(e) =>
                      updateOpportunity(selectedOpportunity.id, {
                        tiktokShopLink: e.target.value,
                      })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Deal Amount"
                    type="number"
                    value={selectedOpportunity.dealAmount || ''}
                    onChange={(e) =>
                      updateOpportunity(selectedOpportunity.id, {
                        dealAmount: parseFloat(e.target.value) || null,
                      })
                    }
                    placeholder="Enter amount"
                  />
                  <Select
                    label="Stage"
                    value={selectedOpportunity.stage}
                    onChange={(e) =>
                      updateOpportunity(selectedOpportunity.id, { stage: e.target.value })
                    }
                    options={DEAL_STAGES.map((s) => ({ value: s.value, label: s.label }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Best Contact"
                    value={selectedOpportunity.bestContact || ''}
                    onChange={(e) =>
                      updateOpportunity(selectedOpportunity.id, {
                        bestContact: e.target.value,
                      })
                    }
                    placeholder="Contact info"
                  />
                  <Input
                    label="Contact Method"
                    value={selectedOpportunity.bestContactMethod || ''}
                    onChange={(e) =>
                      updateOpportunity(selectedOpportunity.id, {
                        bestContactMethod: e.target.value,
                      })
                    }
                    placeholder="Email, DM, etc."
                  />
                </div>

                <Select
                  label="Creator Decision"
                  value={selectedOpportunity.creatorDecision}
                  onChange={(e) =>
                    updateOpportunity(selectedOpportunity.id, {
                      creatorDecision: e.target.value,
                    })
                  }
                  options={CREATOR_DECISIONS.map((d) => ({ value: d.value, label: d.label }))}
                />

                {/* Delivery fields for closed deals */}
                {selectedOpportunity.stage === 'CLOSED' && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Delivery</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <Select
                        label="Status"
                        value={selectedOpportunity.deliveryStatus}
                        onChange={(e) =>
                          updateOpportunity(selectedOpportunity.id, {
                            deliveryStatus: e.target.value,
                          })
                        }
                        options={DELIVERY_STATUSES.map((s) => ({
                          value: s.value,
                          label: s.label,
                        }))}
                      />
                      <Input
                        label="Videos Committed"
                        type="number"
                        value={selectedOpportunity.videosCommitted}
                        onChange={(e) =>
                          updateOpportunity(selectedOpportunity.id, {
                            videosCommitted: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <Input
                        label="Videos Delivered"
                        type="number"
                        value={selectedOpportunity.videosDelivered}
                        onChange={(e) =>
                          updateOpportunity(selectedOpportunity.id, {
                            videosDelivered: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <Textarea
                      label="Delivery Notes"
                      value={selectedOpportunity.deliveryNotes || ''}
                      onChange={(e) =>
                        updateOpportunity(selectedOpportunity.id, {
                          deliveryNotes: e.target.value,
                        })
                      }
                      rows={2}
                      className="mt-3"
                    />
                  </div>
                )}

                <Textarea
                  label="Notes"
                  value={selectedOpportunity.notes || ''}
                  onChange={(e) =>
                    updateOpportunity(selectedOpportunity.id, { notes: e.target.value })
                  }
                  rows={3}
                />

                {/* Tasks Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Tasks</h4>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={taskView === 'due' ? 'primary' : 'secondary'}
                        onClick={() => setTaskView('due')}
                      >
                        Due Now ({dueNowTasks.length})
                      </Button>
                      <Button
                        size="sm"
                        variant={taskView === 'upcoming' ? 'primary' : 'secondary'}
                        onClick={() => setTaskView('upcoming')}
                      >
                        Upcoming ({upcomingTasks.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowNewTask(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* New Task Form */}
                  {showNewTask && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                      <Input
                        placeholder="Task title"
                        value={newTask.title}
                        onChange={(e) =>
                          setNewTask((prev) => ({ ...prev, title: e.target.value }))
                        }
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) =>
                            setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
                          }
                        />
                        <Select
                          value={newTask.stage}
                          onChange={(e) =>
                            setNewTask((prev) => ({ ...prev, stage: e.target.value }))
                          }
                          options={DEAL_STAGES.map((s) => ({
                            value: s.value,
                            label: s.label,
                          }))}
                        />
                        <Select
                          value={newTask.channel}
                          onChange={(e) =>
                            setNewTask((prev) => ({ ...prev, channel: e.target.value }))
                          }
                          options={[
                            { value: '', label: 'No channel' },
                            ...TASK_CHANNELS.map((c) => ({
                              value: c.value,
                              label: c.label,
                            })),
                          ]}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowNewTask(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={createTask}>
                          Add Task
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Task List */}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {displayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 py-2 border-b border-gray-100"
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => toggleTask(task.id, e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span className="flex-1 text-sm">{task.title}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                    {displayTasks.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No {taskView === 'due' ? 'due' : 'upcoming'} tasks
                      </p>
                    )}
                  </div>

                  {/* Completed Tasks Toggle */}
                  {completedTasks.length > 0 && (
                    <button
                      onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mt-2"
                    >
                      {showCompletedTasks ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {completedTasks.length} completed
                    </button>
                  )}

                  {showCompletedTasks && (
                    <div className="space-y-1 mt-2 opacity-60">
                      {completedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={(e) => toggleTask(task.id, e.target.checked)}
                            className="h-4 w-4"
                          />
                          <span className="flex-1 text-sm line-through">
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="text-center py-12">
              <p className="text-gray-500">Select an opportunity to view details</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeleteArmed(false)
          setDeleteConfirmName('')
        }}
        title="Delete Creator Workspace"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">
                All opportunities, tasks, and data associated with{' '}
                <strong>{data.creator.name}</strong> will be permanently deleted.
              </p>
            </div>
          </div>

          {!deleteArmed ? (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setDeleteArmed(true)}
            >
              Arm Deletion
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Type <strong>{data.creator.name}</strong> to confirm:
              </p>
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Type creator name"
              />
              <Button
                variant="danger"
                className="w-full"
                disabled={deleteConfirmName !== data.creator.name}
                onClick={deleteCreator}
              >
                Permanently Delete
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
