import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPortalLogin, hasPortalPassword, createPortalCredentials, AUTHORIZATION_AGREEMENT_TEXT, AGREEMENT_VERSION } from '@/lib/portal-auth'

// Check if portal has password set
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const creator = await prisma.creator.findUnique({
      where: { slug },
      include: {
        portalCredential: true,
      },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    const hasPassword = await hasPortalPassword(slug)

    return NextResponse.json({
      hasPassword,
      creatorName: creator.name,
      onboardingStep: creator.portalCredential?.onboardingStep || 1,
      onboardingComplete: creator.portalCredential?.onboardingComplete || false,
    })
  } catch (error) {
    console.error('Error checking portal auth:', error)
    return NextResponse.json(
      { error: 'Failed to check auth status' },
      { status: 500 }
    )
  }
}

// Login or create password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { password, email, action, acceptAgreement } = body

    const creator = await prisma.creator.findUnique({
      where: { slug },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Action: setup (create new password and agreement)
    if (action === 'setup') {
      if (!password || !email || !acceptAgreement) {
        return NextResponse.json(
          { error: 'Password, email, and agreement acceptance are required' },
          { status: 400 }
        )
      }

      // Update creator email
      await prisma.creator.update({
        where: { id: creator.id },
        data: { email },
      })

      // Create portal credentials
      await createPortalCredentials(creator.id, password)

      // Create agreement record
      await prisma.agreement.upsert({
        where: { creatorId: creator.id },
        update: {
          acceptedAt: new Date(),
          version: AGREEMENT_VERSION,
          agreementText: AUTHORIZATION_AGREEMENT_TEXT,
        },
        create: {
          creatorId: creator.id,
          acceptedAt: new Date(),
          version: AGREEMENT_VERSION,
          agreementText: AUTHORIZATION_AGREEMENT_TEXT,
        },
      })

      // Move to step 2
      await prisma.portalCredential.update({
        where: { creatorId: creator.id },
        data: { onboardingStep: 2 },
      })

      return NextResponse.json({
        success: true,
        creatorId: creator.id,
        portalUrl: `/portal/${creator.slug}`,
      })
    }

    // Action: login
    if (action === 'login') {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        )
      }

      const { valid, creatorId } = await verifyPortalLogin(slug, password)

      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        creatorId,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error with portal auth:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
