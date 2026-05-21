import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Authenticate user here if needed
        return {
          allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[Upload Token] Blob upload completed:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[Upload Token] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
