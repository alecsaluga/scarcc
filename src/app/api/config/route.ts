import { NextResponse } from 'next/server'
import { getProviderInfo } from '@/lib/ai-analysis'

export async function GET() {
  const { provider, configured } = getProviderInfo()

  return NextResponse.json({
    aiProvider: provider,
    aiConfigured: configured,
    commissionRate: parseFloat(process.env.COMMISSION_RATE || '0.30'),
    blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  })
}
