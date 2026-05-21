'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge, StageBadge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { CONTACT_METHODS, DELIVERY_STATUSES } from '@/lib/constants'
import {
  Lock,
  CheckCircle,
  ChevronRight,
  Plus,
  RotateCcw,
  Trash2,
  ExternalLink,
} from 'lucide-react'

// Reusable Logo component for creator pages
function CreatorLogo() {
  return (
    <div className="creator-brand-header">
      <Image
        src="/assets/retainergoat-logo.png"
        alt="RetainerGoat"
        width={280}
        height={66}
        className="creator-brand-logo"
        priority
      />
    </div>
  )
}

interface PortalAuthInfo {
  hasPassword: boolean
  creatorName: string
  onboardingStep: number
  onboardingComplete: boolean
}

interface Deal {
  id: string
  brand: string
  productName: string
  dealAmount: number | null
  stage: string
  creatorDecision: string
  deliveryStatus: string
  videosCommitted: number
  videosDelivered: number
  deliveryNotes: string | null
}

interface SelfTrackedDeal {
  id: string
  brandName: string
  monthlyVideosRequired: number
  completedVideos: number
}

interface BrandOnboarding {
  brand: string
  hasRetainer: boolean | null
  hasUsageRights: boolean | null
  shopName: string | null
  bestContactMethod: string | null
  bestContactName: string | null
  bestContactDetails: string | null
  completed: boolean
}

interface BrandTableRow {
  opportunityId: string
  brand: string
  productName: string
  gmv: number
  hasRetainer: boolean | null
  hasUsageRights: boolean | null
  bestContact: string
}

export default function PortalPage() {
  const params = useParams()
  const creatorSlug = params.creatorSlug as string

  const [authInfo, setAuthInfo] = useState<PortalAuthInfo | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Auth form state
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [acceptAgreement, setAcceptAgreement] = useState(false)

  // Onboarding state
  const [brands, setBrands] = useState<string[]>([])
  const [brandsLoaded, setBrandsLoaded] = useState(false)
  const [showBrandTable, setShowBrandTable] = useState(false) // Transition screen shown first
  const [brandTableData, setBrandTableData] = useState<BrandTableRow[]>([])
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [savingOnboarding, setSavingOnboarding] = useState(false)

  // Portal content state
  const [deals, setDeals] = useState<Deal[]>([])
  const [selfTrackedDeals, setSelfTrackedDeals] = useState<SelfTrackedDeal[]>([])
  const [newDealBrand, setNewDealBrand] = useState('')
  const [newDealVideos, setNewDealVideos] = useState('')

  // Load auth info
  useEffect(() => {
    async function loadAuthInfo() {
      try {
        const response = await fetch(`/api/portal/${creatorSlug}/auth`)
        if (!response.ok) throw new Error('Creator not found')
        const data = await response.json()
        setAuthInfo(data)
        setOnboardingComplete(data.onboardingComplete)
      } catch (err) {
        setError('Creator not found')
      } finally {
        setLoading(false)
      }
    }
    loadAuthInfo()
  }, [creatorSlug])

  // Load portal data when authenticated and onboarding complete
  useEffect(() => {
    if (isAuthenticated && onboardingComplete) {
      loadDeals()
      loadSelfTrackedDeals()
    }
  }, [isAuthenticated, onboardingComplete])

  // Load brands for onboarding
  useEffect(() => {
    if (isAuthenticated && authInfo && !authInfo.onboardingComplete && authInfo.onboardingStep === 2) {
      loadBrandsForOnboarding()
    }
  }, [isAuthenticated, authInfo])

  // Auto-complete onboarding ONLY if brands have been loaded and there are none
  useEffect(() => {
    async function completeOnboarding() {
      // Only auto-complete AFTER we've loaded brands and confirmed there are none
      if (isAuthenticated && !onboardingComplete && brandsLoaded && brands.length === 0 && authInfo?.onboardingStep === 2) {
        await fetch(`/api/portal/${creatorSlug}/onboarding`, { method: 'PUT' })
        setOnboardingComplete(true)
      }
    }
    completeOnboarding()
  }, [isAuthenticated, onboardingComplete, brandsLoaded, brands.length, authInfo?.onboardingStep, creatorSlug])

  async function loadBrandsForOnboarding() {
    const response = await fetch(`/api/portal/${creatorSlug}/onboarding`)
    const data = await response.json()

    // Use the new opportunities array with full product info
    const opportunities = data.opportunities || []
    const brandsList = data.brands || []
    setBrands(brandsList)

    // Initialize table data with full product info
    setBrandTableData(opportunities.map((opp: { id: string; brand: string; productName: string; gmv: number }) => ({
      opportunityId: opp.id,
      brand: opp.brand,
      productName: opp.productName,
      gmv: opp.gmv,
      hasRetainer: null,
      hasUsageRights: null,
      bestContact: '',
    })))
    setBrandsLoaded(true)
  }

  async function loadDeals() {
    const response = await fetch(`/api/portal/${creatorSlug}/deals`)
    const data = await response.json()
    setDeals(data.deals || [])
  }

  async function loadSelfTrackedDeals() {
    const response = await fetch(`/api/portal/${creatorSlug}/self-tracked`)
    const data = await response.json()
    setSelfTrackedDeals(data.deals || [])
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch(`/api/portal/${creatorSlug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup',
          email,
          password,
          acceptAgreement,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setIsAuthenticated(true)
      setAuthInfo(prev => prev ? { ...prev, onboardingStep: 2, hasPassword: true } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      const response = await fetch(`/api/portal/${creatorSlug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          password,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setIsAuthenticated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  function updateBrandRow(index: number, field: keyof BrandTableRow, value: BrandTableRow[keyof BrandTableRow]) {
    setBrandTableData(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  async function handleTableSubmit() {
    setSavingOnboarding(true)
    setError(null)

    try {
      // Submit all brand data at once
      for (const row of brandTableData) {
        await fetch(`/api/portal/${creatorSlug}/onboarding`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand: row.brand,
            hasRetainer: row.hasRetainer,
            hasUsageRights: row.hasUsageRights,
            bestContactDetails: row.bestContact,
          }),
        })
      }

      // Complete onboarding
      await fetch(`/api/portal/${creatorSlug}/onboarding`, {
        method: 'PUT',
      })
      setOnboardingComplete(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingOnboarding(false)
    }
  }

  async function handleDealUpdate(dealId: string, updates: Partial<Deal>) {
    try {
      await fetch(`/api/portal/${creatorSlug}/deals`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, ...updates }),
      })
      loadDeals()
    } catch (err) {
      console.error('Failed to update deal:', err)
    }
  }

  async function handleCreateSelfTracked() {
    if (!newDealBrand.trim()) return

    try {
      await fetch(`/api/portal/${creatorSlug}/self-tracked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: newDealBrand,
          monthlyVideosRequired: parseInt(newDealVideos) || 0,
        }),
      })
      setNewDealBrand('')
      setNewDealVideos('')
      loadSelfTrackedDeals()
    } catch (err) {
      console.error('Failed to create deal:', err)
    }
  }

  async function handleSelfTrackedAction(dealId: string, action: string) {
    try {
      await fetch(`/api/portal/${creatorSlug}/self-tracked`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, action }),
      })
      loadSelfTrackedDeals()
    } catch (err) {
      console.error('Failed to update deal:', err)
    }
  }

  if (loading) {
    return (
      <div className="creator-shell min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (error && !authInfo) {
    return (
      <div className="creator-shell min-h-screen bg-white flex items-center justify-center p-5">
        <div className="w-full max-w-[480px]">
          <div className="creator-panel">
            <CreatorLogo />
            <div className="creator-card text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated - show login or setup
  if (!isAuthenticated) {
    return (
      <div className="creator-shell min-h-screen bg-white flex items-center justify-center p-5">
        <div className="w-full max-w-[480px]">
          <div className="creator-panel">
            <CreatorLogo />

            <div className="text-center mb-6">
              <Lock className="h-10 w-10 text-brand-600 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                {authInfo?.hasPassword ? 'Portal Login' : 'Set Up Your Portal'}
              </h1>
              <p className="question-copy mx-auto mt-2">
                Welcome, {authInfo?.creatorName}!
              </p>
            </div>

            <div className="creator-card">
              {authInfo?.hasPassword ? (
                // Login form
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="field">
                    <label className="mono-label">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && <div className="form-alert">{error}</div>}
                  <button type="submit" className="btn-creator-primary w-full">
                    Log In
                  </button>
                </form>
              ) : (
                // Setup form
                <form onSubmit={handleSetup} className="space-y-4">
                  <div className="field">
                    <label className="mono-label">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="mono-label">Create Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a secure password"
                      required
                    />
                  </div>

                  <div className="agreement-textarea text-sm text-gray-600 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold mb-2 text-gray-900">Authorization Agreement</h4>
                    <p className="mb-2">
                      By accepting this agreement, I authorize RetainerGoat to contact brands
                      and negotiate deals on my behalf.
                    </p>
                    <p className="mb-2">
                      I understand that final deal acceptance requires my approval
                      and that RetainerGoat takes a 30% commission on closed deals.
                    </p>
                  </div>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={acceptAgreement}
                      onChange={(e) => setAcceptAgreement(e.target.checked)}
                      required
                    />
                    <span className="text-sm text-gray-700">
                      I have read and accept the authorization agreement
                    </span>
                  </label>

                  {error && <div className="form-alert">{error}</div>}

                  <button type="submit" className="btn-creator-primary w-full" disabled={!acceptAgreement}>
                    Create Portal Account
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Onboarding step 2: Brand onboarding - Transition screen
  if (!onboardingComplete && brands.length > 0 && !showBrandTable) {
    return (
      <div className="creator-shell min-h-screen bg-white p-5">
        <div className="max-w-[680px] mx-auto">
          <div className="creator-panel">
            <CreatorLogo />

            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="creator-title mb-4">
                We have broken down your deals
              </h1>
              <p className="question-copy mx-auto text-center">
                We found <strong>{brandTableData.length} products</strong> in your TikTok Shop data.
              </p>
            </div>

            <div className="creator-card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ letterSpacing: '-0.02em' }}>
                The next screen is incredibly important
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Let us know about any <strong>current retainer deals</strong> or <strong>usage rights agreements</strong> you have with these brands. If you have a direct contact at any brand, add that too.
              </p>
              <p className="text-sm text-gray-500">
                This helps us avoid reaching out to brands you already have deals with and focus on new opportunities.
              </p>
            </div>

            <button
              onClick={() => setShowBrandTable(true)}
              className="btn-creator-primary w-full mt-6"
            >
              Review My Brands <ChevronRight className="h-4 w-4 ml-2 inline" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Onboarding step 2: Brand table view
  if (!onboardingComplete && brands.length > 0 && showBrandTable) {
    return (
      <div className="creator-shell min-h-screen bg-white p-5">
        <div className="max-w-[960px] mx-auto">
          <div className="creator-panel">
            <CreatorLogo />

            <div className="flex items-center justify-between mb-4">
              <span className="mono-label">Brand Review</span>
              <Badge variant="blue">{brandTableData.length} Products</Badge>
            </div>

            <p className="question-copy mb-6">
              Check any brands you have existing deals with. All fields are optional.
            </p>

            {error && <div className="form-alert mb-4">{error}</div>}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 mono-label text-xs">Brand / Product</th>
                    <th className="text-center py-3 px-2 mono-label text-xs w-24">Retainer?</th>
                    <th className="text-center py-3 px-2 mono-label text-xs w-24">Usage Rights?</th>
                    <th className="text-left py-3 px-2 mono-label text-xs">Best Contact (optional)</th>
                  </tr>
                </thead>
                <tbody>
                  {brandTableData.map((row, index) => (
                    <tr key={row.opportunityId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">{row.brand}</span>
                          <p className="text-xs text-gray-500 truncate max-w-[280px]" title={row.productName}>
                            {row.productName}
                          </p>
                          {row.gmv > 0 && (
                            <p className="text-xs text-green-600 font-medium">
                              ${row.gmv >= 1000 ? `${(row.gmv / 1000).toFixed(1)}K` : row.gmv.toFixed(0)} GMV
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.hasRetainer === true}
                          onChange={(e) => updateBrandRow(index, 'hasRetainer', e.target.checked ? true : null)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.hasUsageRights === true}
                          onChange={(e) => updateBrandRow(index, 'hasUsageRights', e.target.checked ? true : null)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={row.bestContact}
                          onChange={(e) => updateBrandRow(index, 'bestContact', e.target.value)}
                          placeholder="Email or handle..."
                          className="w-full text-sm py-1.5 px-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBrandTable(false)}
                className="btn-creator-secondary flex-1"
              >
                Back
              </button>
              <button
                onClick={handleTableSubmit}
                disabled={savingOnboarding}
                className="btn-creator-primary flex-1"
              >
                {savingOnboarding ? 'Saving...' : (
                  <>
                    Complete Setup <CheckCircle className="h-4 w-4 ml-2 inline" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while brands are being loaded or while auto-completing (only if truly no brands)
  if (isAuthenticated && !onboardingComplete && authInfo?.onboardingStep === 2 && (!brandsLoaded || (brandsLoaded && brands.length === 0))) {
    return (
      <div className="creator-shell min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  // Main portal view
  return (
    <div className="creator-shell min-h-screen bg-white">
      <header className="border-b border-gray-200 px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Image
            src="/assets/retainergoat-logo.png"
            alt="RetainerGoat"
            width={180}
            height={42}
            priority
          />
          <p className="text-sm text-gray-600">Welcome, {authInfo?.creatorName}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Brand Deals from Team */}
        <Card>
          <CardHeader>
            <CardTitle>Your Deals</CardTitle>
            <p className="text-sm text-gray-600">
              Active deals we are negotiating on your behalf
            </p>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No active deals yet. We will notify you when we have opportunities to discuss.
              </p>
            ) : (
              <div className="space-y-4">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{deal.brand}</h4>
                        <p className="text-sm text-gray-600">{deal.productName}</p>
                      </div>
                      <div className="text-right">
                        <StageBadge stage={deal.stage as any} />
                        {deal.dealAmount && (
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ${deal.dealAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {deal.creatorDecision === 'PENDING' && deal.dealAmount && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleDealUpdate(deal.id, { creatorDecision: 'ACCEPTED' })}
                        >
                          Accept Deal
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDealUpdate(deal.id, { creatorDecision: 'DECLINED' })}
                        >
                          Decline
                        </Button>
                      </div>
                    )}

                    {deal.stage === 'CLOSED' && deal.creatorDecision === 'ACCEPTED' && (
                      <div className="pt-2 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            Delivery Progress
                          </span>
                          <Badge
                            variant={
                              deal.deliveryStatus === 'COMPLETE'
                                ? 'green'
                                : deal.deliveryStatus === 'IN_PROGRESS'
                                ? 'yellow'
                                : 'gray'
                            }
                          >
                            {deal.deliveryStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <ProgressBar
                          value={deal.videosDelivered}
                          max={deal.videosCommitted || 1}
                        />
                        <div className="flex gap-2">
                          <Select
                            value={deal.deliveryStatus}
                            onChange={(e) =>
                              handleDealUpdate(deal.id, { deliveryStatus: e.target.value })
                            }
                            options={DELIVERY_STATUSES.map((s) => ({
                              value: s.value,
                              label: s.label,
                            }))}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={deal.videosDelivered}
                            onChange={(e) =>
                              handleDealUpdate(deal.id, {
                                videosDelivered: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-24"
                            placeholder="Delivered"
                          />
                        </div>
                        <Textarea
                          value={deal.deliveryNotes || ''}
                          onChange={(e) =>
                            handleDealUpdate(deal.id, { deliveryNotes: e.target.value })
                          }
                          placeholder="Add delivery notes..."
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Self-Tracked Deals */}
        <Card>
          <CardHeader>
            <CardTitle>Your Private Tracking</CardTitle>
            <p className="text-sm text-gray-600">
              Track your own deals separate from team-sourced opportunities
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new self-tracked deal */}
            <div className="flex gap-2">
              <Input
                value={newDealBrand}
                onChange={(e) => setNewDealBrand(e.target.value)}
                placeholder="Brand name"
                className="flex-1"
              />
              <Input
                type="number"
                value={newDealVideos}
                onChange={(e) => setNewDealVideos(e.target.value)}
                placeholder="Videos/mo"
                className="w-28"
              />
              <Button onClick={handleCreateSelfTracked}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selfTrackedDeals.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No private deals tracked yet
              </p>
            ) : (
              <div className="space-y-3">
                {selfTrackedDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{deal.brandName}</h4>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSelfTrackedAction(deal.id, 'increment')}
                        >
                          +1
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSelfTrackedAction(deal.id, 'reset')}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSelfTrackedAction(deal.id, 'delete')}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <ProgressBar
                      value={deal.completedVideos}
                      max={deal.monthlyVideosRequired || 1}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
