import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export async function POST(request: Request): Promise<NextResponse> {
  console.log('[Upload Token] Received request')

  // Log environment check
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN
  console.log('[Upload Token] BLOB_READ_WRITE_TOKEN set:', hasToken)

  if (!hasToken) {
    console.error('[Upload Token] Missing BLOB_READ_WRITE_TOKEN')
    return NextResponse.json(
      { error: 'Blob storage not configured' },
      { status: 500 }
    )
  }

  let body: HandleUploadBody
  try {
    body = await request.json()
    console.log('[Upload Token] Request body type:', body.type)
    console.log('[Upload Token] Request body payload:', JSON.stringify(body.payload || {}).substring(0, 200))
  } catch (e) {
    console.error('[Upload Token] Failed to parse request body:', e)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  try {
    console.log('[Upload Token] Calling handleUpload...')
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log('[Upload Token] onBeforeGenerateToken called for:', pathname)
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/quicktime',
            'video/webm',
            'video/x-msvideo',
            'video/x-m4v',
            'video/mpeg',
            'video/3gpp',
            'video/3gpp2',
            'video/x-matroska',
            'video/ogg',
            'video/x-ms-wmv',
            'application/octet-stream', // Fallback for unknown types
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB max
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[Upload Token] Upload completed! URL:', blob.url)
      },
    })

    console.log('[Upload Token] handleUpload response:', JSON.stringify(jsonResponse).substring(0, 500))
    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('[Upload Token] handleUpload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
