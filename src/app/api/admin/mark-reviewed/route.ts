import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Mark all pending videos as reviewed for a creator
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

    await prisma.uploadedVideo.updateMany({
      where: {
        creatorId,
        status: 'PENDING_REVIEW',
      },
      data: {
        status: 'COMPLETED',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking as reviewed:', error)
    return NextResponse.json(
      { error: 'Failed to mark as reviewed' },
      { status: 500 }
    )
  }
}
