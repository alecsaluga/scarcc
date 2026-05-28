import { readFile } from 'fs/promises'

export interface ExtractedProductData {
  brandName: string
  productName: string
  gmv: number
  itemsSold: number
  confidence: number
  notes: string | null
}

export interface AnalysisResult {
  success: boolean
  products: ExtractedProductData[]
  rawExtraction: string
  error?: string
}

export interface AnalysisProvider {
  analyzeVideo(filePath: string, creatorName: string, filename: string): Promise<AnalysisResult>
  analyzeVideoFromUrl(url: string, creatorName: string, filename: string): Promise<AnalysisResult>
}

// Gemini implementation using Files API (matches reference implementation)
export class GeminiAnalysisProvider implements AnalysisProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async analyzeVideo(filePath: string, creatorName: string, filename: string): Promise<AnalysisResult> {
    try {
      console.log('[Gemini] Starting video analysis for:', filename)

      // Read the video file
      const fileBuffer = await readFile(filePath)
      const mimeType = getMimeType(filename)

      // Upload to Gemini Files API
      console.log('[Gemini] Uploading file to Gemini Files API...')
      const uploadedFile = await this.uploadFileToGemini(fileBuffer, mimeType)
      console.log('[Gemini] File uploaded:', uploadedFile.name)

      // Poll until file is ACTIVE (check every 1 second, max 60 seconds)
      let fileStatus = uploadedFile
      let pollCount = 0
      const maxPolls = 60
      while (!fileStatus.state || fileStatus.state.toString() !== 'ACTIVE') {
        if (fileStatus.state && fileStatus.state.toString() === 'FAILED') {
          throw new Error('Gemini could not process this uploaded video.')
        }
        if (pollCount >= maxPolls) {
          throw new Error('Video processing timed out. Try a shorter video.')
        }

        console.log('[Gemini] Waiting for file to become ACTIVE... (poll', pollCount + 1, ')')
        await sleep(1000)
        fileStatus = await this.getGeminiFile(uploadedFile.name)
        pollCount++
      }
      console.log('[Gemini] File is ACTIVE after', pollCount, 'polls, starting extraction...')

      // Use shared extraction logic
      return this.runExtraction(fileStatus, creatorName, filename)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Gemini] Error:', errorMessage)
      return {
        success: false,
        products: [],
        rawExtraction: '',
        error: errorMessage
      }
    }
  }

  async analyzeVideoFromUrl(url: string, creatorName: string, filename: string): Promise<AnalysisResult> {
    try {
      console.log('[Gemini] Starting URL-based video analysis for:', filename)

      // Fetch the video from the URL
      console.log('[Gemini] Fetching video from Blob URL...')
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)
      const mimeType = getMimeType(filename)

      console.log('[Gemini] Video fetched, size:', fileBuffer.length, 'bytes')

      // Upload to Gemini Files API
      console.log('[Gemini] Uploading file to Gemini Files API...')
      const uploadedFile = await this.uploadFileToGemini(fileBuffer, mimeType)
      console.log('[Gemini] File uploaded:', uploadedFile.name)

      // Poll until file is ACTIVE (check every 1 second, max 60 seconds)
      let fileStatus = uploadedFile
      let pollCount = 0
      const maxPolls = 60
      while (!fileStatus.state || fileStatus.state.toString() !== 'ACTIVE') {
        if (fileStatus.state && fileStatus.state.toString() === 'FAILED') {
          throw new Error('Gemini could not process this uploaded video.')
        }
        if (pollCount >= maxPolls) {
          throw new Error('Video processing timed out. Try a shorter video.')
        }

        console.log('[Gemini] Waiting for file to become ACTIVE... (poll', pollCount + 1, ')')
        await sleep(1000)
        fileStatus = await this.getGeminiFile(uploadedFile.name)
        pollCount++
      }
      console.log('[Gemini] File is ACTIVE after', pollCount, 'polls, starting extraction...')

      // Use the same extraction logic as analyzeVideo
      return this.runExtraction(fileStatus, creatorName, filename)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Gemini] Error:', errorMessage)
      return {
        success: false,
        products: [],
        rawExtraction: '',
        error: errorMessage
      }
    }
  }

  private async runExtraction(fileStatus: GeminiFile, creatorName: string, filename: string): Promise<AnalysisResult> {
    // Single-pass extraction for speed
    console.log('[Gemini] Running single-pass extraction...')

    const extractPrompt = `
You are extracting e-commerce product analytics from a TikTok Shop creator's screen recording.

Watch the ENTIRE video. This is a SCROLLING recording - products appear as the creator scrolls through their analytics.

Return strict JSON as an array. Each object:
{
  "brandName": "string (actual brand/company name, NOT product description)",
  "productName": "string (FULL exact product name)",
  "gmv": "string (e.g. '$539.2K')",
  "itemsSold": "string",
  "confidence": "high|medium|low",
  "notes": "string or null"
}

BRAND RULES:
- Extract the actual brand (Shark, Ninja, Dyson, VEVOR, etc.)
- Look at the START of product names for brand
- If unclear, use "Unknown"

Creator: "${creatorName}" | File: "${filename}"

Return ALL products as a JSON array.
`.trim()

    const rawText = await this.callGemini(fileStatus, extractPrompt)
    console.log('[Gemini] Raw response:', rawText.substring(0, 200) + '...')

    // Parse JSON response
    const parsed = this.parseJsonResponse(rawText)
    const items = Array.isArray(parsed) ? parsed : [parsed]
    console.log('[Gemini] Extracted', items.length, 'products')

    // Normalize to our schema
    const products: ExtractedProductData[] = items.map((item: Record<string, unknown>) => {
      const productName = String(item.productName || 'Unknown')
      const brandName = String(item.brandName || productName)
      return {
        brandName,
        productName,
        gmv: parseGmv(String(item.gmv || '0')),
        itemsSold: parseInt(String(item.itemsSold || '0').replace(/[^0-9]/g, '')) || 0,
        confidence: normalizeConfidenceToNumber(String(item.confidence || 'medium')),
        notes: item.notes ? String(item.notes) : null
      }
    })

    console.log('[Gemini] Final extraction:', products.length, 'products')

    return {
      success: true,
      products,
      rawExtraction: rawText
    }
  }

  private async uploadFileToGemini(fileBuffer: Buffer, mimeType: string): Promise<GeminiFile> {
    // Start resumable upload
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(fileBuffer.length),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file: { mimeType }
        })
      }
    )

    if (!startResponse.ok) {
      const error = await startResponse.text()
      throw new Error(`Gemini file upload could not be started: ${error}`)
    }

    const uploadUrl = startResponse.headers.get('x-goog-upload-url')
    if (!uploadUrl) {
      throw new Error('Gemini did not return an upload URL.')
    }

    // Upload the file
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(fileBuffer.length),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize'
      },
      body: new Uint8Array(fileBuffer)
    })

    const payload = await uploadResponse.json()
    if (!uploadResponse.ok || !payload.file) {
      throw new Error('Gemini file upload failed.')
    }

    return payload.file as GeminiFile
  }

  private async getGeminiFile(fileName: string): Promise<GeminiFile> {
    const result = await this.fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${this.apiKey}`
    )
    return result as unknown as GeminiFile
  }

  private async fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
    const response = await fetch(url, init)
    const payload = await response.json()

    if (!response.ok) {
      throw new Error((payload as { error?: { message?: string } })?.error?.message || 'Gemini request failed.')
    }

    return payload as Record<string, unknown>
  }

  private async callGemini(fileStatus: GeminiFile, prompt: string): Promise<string> {
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: fileStatus.uri,
                mimeType: fileStatus.mimeType
              }
            },
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.1,
      }
    }

    const response = await this.fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    )

    const geminiResponse = response as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    return geminiResponse?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('') || ''
  }

  private parseJsonResponse(rawText: string): Record<string, unknown> | Record<string, unknown>[] {
    const normalized = rawText.trim()
    const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const jsonCandidate = fencedMatch ? fencedMatch[1] : normalized

    try {
      return JSON.parse(jsonCandidate)
    } catch {
      throw new Error('The AI provider returned an unreadable response. Try the upload again.')
    }
  }
}

interface GeminiFile {
  name: string
  uri: string
  mimeType: string
  state: string
}

// Mock provider for development
export class MockAnalysisProvider implements AnalysisProvider {
  async analyzeVideoFromUrl(_url: string, creatorName: string, filename: string): Promise<AnalysisResult> {
    return this.analyzeVideo('', creatorName, filename)
  }

  async analyzeVideo(_filePath: string, creatorName: string, filename: string): Promise<AnalysisResult> {
    console.log('[Mock] Analyzing video for:', creatorName)

    // Simulate processing time
    await sleep(2000)

    const mockProducts: ExtractedProductData[] = [
      {
        brandName: 'GlowLab',
        productName: 'Viral Skincare Serum',
        gmv: 15420.00,
        itemsSold: 342,
        confidence: 0.3, // low
        notes: `Mock mode is active for ${creatorName}. Add a Gemini API key to run live extraction for ${filename}.`
      },
      {
        brandName: 'LumiGlow',
        productName: 'LED Face Mask Pro',
        gmv: 28750.50,
        itemsSold: 215,
        confidence: 0.3,
        notes: 'Demo product - not from actual video analysis'
      },
      {
        brandName: 'HairRevive',
        productName: 'Hair Growth Oil Bundle',
        gmv: 8920.00,
        itemsSold: 445,
        confidence: 0.3,
        notes: 'Demo product - not from actual video analysis'
      }
    ]

    // Randomly select 1-3 products to simulate variation
    const numProducts = Math.floor(Math.random() * 3) + 1
    const selectedProducts = mockProducts.slice(0, numProducts)

    return {
      success: true,
      products: selectedProducts,
      rawExtraction: JSON.stringify({ products: selectedProducts }, null, 2)
    }
  }
}

// Factory to get analysis provider
export function getAnalysisProvider(): AnalysisProvider {
  const provider = process.env.AI_PROVIDER || 'mock'
  const geminiKey = process.env.GEMINI_API_KEY

  console.log(`[AI Analysis] Provider: ${provider}, Key configured: ${!!geminiKey}`)

  if (provider === 'gemini' && geminiKey) {
    return new GeminiAnalysisProvider(geminiKey)
  } else {
    console.log('[AI Analysis] Using mock provider - set AI_PROVIDER=gemini and GEMINI_API_KEY to use real analysis')
    return new MockAnalysisProvider()
  }
}

export function getProviderInfo(): { provider: string; configured: boolean } {
  const provider = process.env.AI_PROVIDER || 'mock'
  const configured = provider === 'mock' || !!process.env.GEMINI_API_KEY
  return { provider, configured }
}

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska'
  }
  return mimeTypes[ext || ''] || 'video/mp4'
}

function parseGmv(gmvString: string): number {
  // Handle K (thousands) and M (millions) suffixes
  // Examples: "$539.2K" -> 539200, "$1.2M" -> 1200000, "$500" -> 500
  const str = gmvString.toUpperCase().trim()

  // Check for K suffix (thousands)
  if (str.includes('K')) {
    const numPart = str.replace(/[^0-9.]/g, '')
    return (parseFloat(numPart) || 0) * 1000
  }

  // Check for M suffix (millions)
  if (str.includes('M')) {
    const numPart = str.replace(/[^0-9.]/g, '')
    return (parseFloat(numPart) || 0) * 1000000
  }

  // No suffix - just parse the number
  const cleaned = str.replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

function normalizeConfidenceToNumber(confidence: string): number {
  const lower = confidence.toLowerCase()
  if (lower === 'high') return 0.95
  if (lower === 'medium') return 0.7
  if (lower === 'low') return 0.3
  return 0.5
}
