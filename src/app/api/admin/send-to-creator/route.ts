import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Send email to creator with their portal link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { creatorId } = body

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Missing creatorId' },
        { status: 400 }
      )
    }

    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        opportunities: true,
        portalCredential: true,
      },
    })

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    if (!creator.email) {
      return NextResponse.json(
        { error: 'Creator has no email address' },
        { status: 400 }
      )
    }

    // Generate a temporary password if they don't have portal credentials
    let tempPassword: string | null = null
    if (!creator.portalCredential) {
      tempPassword = Math.random().toString(36).slice(-8)
      const bcrypt = await import('bcryptjs')
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      await prisma.portalCredential.create({
        data: {
          creatorId: creator.id,
          passwordHash,
          onboardingStep: 1,
          onboardingComplete: false,
        },
      })
    }

    // Mark all videos as reviewed
    await prisma.uploadedVideo.updateMany({
      where: {
        creatorId,
        status: 'PENDING_REVIEW',
      },
      data: {
        status: 'COMPLETED',
      },
    })

    // For now, we'll just log the email details
    // In production, you'd integrate with an email service like Resend, SendGrid, etc.
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://scarcc.vercel.app'}/portal/${creator.slug}`

    console.log('=== SEND EMAIL TO CREATOR ===')
    console.log('To:', creator.email)
    console.log('Subject: Your RetainerGoat Portal is Ready!')
    console.log('Portal URL:', portalUrl)
    if (tempPassword) {
      console.log('Temporary Password:', tempPassword)
    }
    console.log('Products to review:', creator.opportunities.length)
    console.log('=============================')

    // TODO: Replace with actual email sending
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'RetainerGoat <noreply@retainergoat.com>',
    //   to: creator.email,
    //   subject: 'Your RetainerGoat Portal is Ready!',
    //   html: `
    //     <h1>Hey ${creator.name}!</h1>
    //     <p>We've reviewed your TikTok Shop data and found ${creator.opportunities.length} potential brand deals.</p>
    //     <p>Click here to review and complete your onboarding:</p>
    //     <a href="${portalUrl}">${portalUrl}</a>
    //     ${tempPassword ? `<p>Your temporary password: ${tempPassword}</p>` : ''}
    //   `,
    // })

    return NextResponse.json({
      success: true,
      message: 'Email sent (logged to console)',
      portalUrl,
      opportunitiesCount: creator.opportunities.length,
    })
  } catch (error) {
    console.error('Error sending to creator:', error)
    return NextResponse.json(
      { error: 'Failed to send to creator' },
      { status: 500 }
    )
  }
}
