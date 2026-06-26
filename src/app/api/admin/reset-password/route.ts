import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// Reset password for a creator
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { creatorSlug, creatorId } = body

    // Find creator by slug or id
    const creator = await prisma.creator.findFirst({
      where: creatorSlug
        ? { slug: { contains: creatorSlug } }
        : { id: creatorId },
      include: { portalCredential: true },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Generate new password
    const newPassword = Math.random().toString(36).slice(-8)
    const passwordHash = await bcrypt.hash(newPassword, 10)

    if (creator.portalCredential) {
      // Update existing credentials
      await prisma.portalCredential.update({
        where: { creatorId: creator.id },
        data: {
          passwordHash,
          onboardingStep: 2,
          onboardingComplete: false,
        },
      })
    } else {
      // Create new credentials
      await prisma.portalCredential.create({
        data: {
          creatorId: creator.id,
          passwordHash,
          onboardingStep: 2,
          onboardingComplete: false,
        },
      })
    }

    const portalUrl = `https://scarcc.vercel.app/portal/${creator.slug}`

    return NextResponse.json({
      success: true,
      creator: {
        name: creator.name,
        slug: creator.slug,
        tiktokHandle: creator.tiktokHandle,
      },
      portalUrl,
      newPassword,
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}

// GET to reset by query param (easier to use)
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing slug parameter' },
      { status: 400 }
    )
  }

  // Find creator
  const creator = await prisma.creator.findFirst({
    where: { slug: { contains: slug } },
    include: { portalCredential: true },
  })

  if (!creator) {
    return NextResponse.json(
      { error: 'Creator not found' },
      { status: 404 }
    )
  }

  // Generate new password
  const newPassword = Math.random().toString(36).slice(-8)
  const passwordHash = await bcrypt.hash(newPassword, 10)

  if (creator.portalCredential) {
    await prisma.portalCredential.update({
      where: { creatorId: creator.id },
      data: {
        passwordHash,
        onboardingStep: 2,
        onboardingComplete: false,
      },
    })
  } else {
    await prisma.portalCredential.create({
      data: {
        creatorId: creator.id,
        passwordHash,
        onboardingStep: 2,
        onboardingComplete: false,
      },
    })
  }

  const portalUrl = `https://scarcc.vercel.app/portal/${creator.slug}`

  return NextResponse.json({
    success: true,
    creator: {
      name: creator.name,
      slug: creator.slug,
    },
    portalUrl,
    newPassword,
  })
}
