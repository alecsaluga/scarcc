import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Admin endpoint to see most recent creator data
// Access at: https://scarcc.vercel.app/api/admin/recent-creator
export async function GET() {
  try {
    // Get most recent creator
    const creator = await prisma.creator.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedVideos: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            filename: true,
            status: true,
            fileSize: true,
            createdAt: true,
          }
        },
        opportunities: {
          include: {
            extractedProduct: {
              select: {
                gmv: true,
                itemsSold: true,
              }
            },
            tasks: {
              select: {
                id: true,
                title: true,
                completed: true,
              }
            }
          }
        },
        brandOnboardings: true,
        agreement: {
          select: {
            acceptedAt: true,
            version: true,
          }
        },
        portalCredential: {
          select: {
            onboardingComplete: true,
            onboardingStep: true,
          }
        }
      }
    })

    if (!creator) {
      return NextResponse.json({ message: 'No creators found' })
    }

    // Format the response
    const summary = {
      creator: {
        id: creator.id,
        name: creator.name,
        tiktokHandle: creator.tiktokHandle,
        slug: creator.slug,
        portalUrl: `/portal/${creator.slug}`,
        createdAt: creator.createdAt,
        email: creator.email,
      },
      onboarding: {
        hasAgreement: !!creator.agreement,
        agreementDate: creator.agreement?.acceptedAt,
        onboardingComplete: creator.portalCredential?.onboardingComplete || false,
        onboardingStep: creator.portalCredential?.onboardingStep || 0,
      },
      videos: creator.uploadedVideos.map(v => ({
        filename: v.filename,
        status: v.status,
        sizeMB: (v.fileSize / 1024 / 1024).toFixed(2),
        createdAt: v.createdAt,
      })),
      opportunities: creator.opportunities.map(o => ({
        brand: o.brand,
        productName: o.productName,
        gmv: o.extractedProduct?.gmv || 0,
        itemsSold: o.extractedProduct?.itemsSold || 0,
        stage: o.stage,
        creatorDecision: o.creatorDecision,
        tasksTotal: o.tasks.length,
        tasksCompleted: o.tasks.filter(t => t.completed).length,
      })),
      brandOnboardings: creator.brandOnboardings.map(b => ({
        brand: b.brand,
        hasRetainer: b.hasRetainer,
        hasUsageRights: b.hasUsageRights,
        completed: b.completed,
      })),
      totals: {
        videoCount: creator.uploadedVideos.length,
        opportunityCount: creator.opportunities.length,
        totalGMV: creator.opportunities.reduce((sum, o) => sum + (o.extractedProduct?.gmv || 0), 0),
        totalItemsSold: creator.opportunities.reduce((sum, o) => sum + (o.extractedProduct?.itemsSold || 0), 0),
      }
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching recent creator:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    )
  }
}
