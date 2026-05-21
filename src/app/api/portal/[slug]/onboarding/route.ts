import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { completeOnboarding } from '@/lib/portal-auth'

// Get brands that need onboarding
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const creator = await prisma.creator.findUnique({
      where: { slug },
      include: {
        opportunities: {
          include: {
            extractedProduct: true,
          },
        },
        brandOnboardings: true,
      },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Check which brands have been onboarded
    const onboardedBrands = new Set(
      creator.brandOnboardings.filter(b => b.completed).map(b => b.brand)
    )

    // Get opportunities that haven't been onboarded yet, with full product info
    const opportunitiesToOnboard = creator.opportunities
      .filter(o => !onboardedBrands.has(o.brand))
      .map(o => ({
        id: o.id,
        brand: o.brand,
        productName: o.productName,
        gmv: o.extractedProduct?.gmv || 0,
        itemsSold: o.extractedProduct?.itemsSold || 0,
      }))

    // Get current onboarding progress for incomplete brands
    const inProgressOnboardings = creator.brandOnboardings.filter(b => !b.completed)

    // Also return legacy brands array for backward compatibility
    const brands = Array.from(new Set(opportunitiesToOnboard.map(o => o.brand)))

    return NextResponse.json({
      brands, // Legacy: just brand names
      opportunities: opportunitiesToOnboard, // New: full product info
      onboardedCount: onboardedBrands.size,
      totalBrands: creator.opportunities.length,
      inProgress: inProgressOnboardings,
    })
  } catch (error) {
    console.error('Error fetching onboarding status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 }
    )
  }
}

// Save brand onboarding
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const {
      brand,
      hasRetainer,
      hasUsageRights,
      shopName,
      bestContactMethod,
      bestContactName,
      bestContactDetails,
    } = body

    const creator = await prisma.creator.findUnique({
      where: { slug },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Upsert brand onboarding
    const onboarding = await prisma.brandOnboarding.upsert({
      where: {
        creatorId_brand: {
          creatorId: creator.id,
          brand,
        },
      },
      update: {
        hasRetainer,
        hasUsageRights,
        shopName,
        bestContactMethod,
        bestContactName,
        bestContactDetails,
        completed: true,
      },
      create: {
        creatorId: creator.id,
        brand,
        hasRetainer,
        hasUsageRights,
        shopName,
        bestContactMethod,
        bestContactName,
        bestContactDetails,
        completed: true,
      },
    })

    // Update corresponding opportunities with contact info
    if (bestContactDetails || bestContactMethod) {
      await prisma.opportunity.updateMany({
        where: {
          creatorId: creator.id,
          brand,
          bestContact: null, // Only update if not already set
        },
        data: {
          bestContact: bestContactDetails || null,
          bestContactMethod: bestContactMethod || null,
        },
      })
    }

    // Check if all brands are onboarded
    const allOpportunities = await prisma.opportunity.findMany({
      where: { creatorId: creator.id },
    })
    const allBrands = Array.from(new Set(allOpportunities.map(o => o.brand)))

    const completedOnboardings = await prisma.brandOnboarding.count({
      where: {
        creatorId: creator.id,
        completed: true,
      },
    })

    const allComplete = completedOnboardings >= allBrands.length

    return NextResponse.json({
      success: true,
      onboarding,
      allComplete,
      remaining: allBrands.length - completedOnboardings,
    })
  } catch (error) {
    console.error('Error saving brand onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to save brand onboarding' },
      { status: 500 }
    )
  }
}

// Complete onboarding (mark as done)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const creator = await prisma.creator.findUnique({
      where: { slug },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    await completeOnboarding(creator.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
