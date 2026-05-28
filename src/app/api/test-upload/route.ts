import { NextRequest, NextResponse } from 'next/server'
import { getAnalysisProvider } from '@/lib/ai-analysis'

// Test endpoint to verify video analysis works
export const maxDuration = 300 // 5 minutes for testing

export async function POST(request: NextRequest) {
  const start = Date.now()
  const logs: string[] = []
  const log = (msg: string) => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const entry = `[${elapsed}s] ${msg}`
    logs.push(entry)
    console.log(entry)
  }

  try {
    const { videoUrl } = await request.json()

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
    }

    log('Starting test analysis')
    log(`Video URL: ${videoUrl}`)

    const analyzer = getAnalysisProvider()
    log('Got analyzer, starting analysis...')

    const result = await analyzer.analyzeVideoFromUrl(videoUrl, 'Test Creator', 'test.mp4')

    log(`Analysis complete: ${result.success ? 'SUCCESS' : 'FAILED'}`)
    log(`Products found: ${result.products.length}`)

    return NextResponse.json({
      success: result.success,
      products: result.products,
      error: result.error,
      logs,
      totalTime: `${((Date.now() - start) / 1000).toFixed(1)}s`
    })
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : 'Unknown'}`)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      totalTime: `${((Date.now() - start) / 1000).toFixed(1)}s`
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with { "videoUrl": "https://..." } to test video analysis',
    maxDuration: '300 seconds'
  })
}
