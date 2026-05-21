import { put, del, list, type PutBlobResult } from '@vercel/blob'
import { generateFileHash } from './utils'
import { writeFile, unlink, readdir, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export interface UploadResult {
  url: string
  pathname: string
  contentType: string
  size: number
}

export interface StorageService {
  upload(file: File | Blob, filename: string): Promise<UploadResult>
  delete(url: string): Promise<void>
  list(prefix?: string): Promise<{ url: string; pathname: string }[]>
}

// Vercel Blob implementation
export class VercelBlobStorage implements StorageService {
  async upload(file: File | Blob, filename: string): Promise<UploadResult> {
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: file.size,
    }
  }

  async delete(url: string): Promise<void> {
    await del(url)
  }

  async list(prefix?: string): Promise<{ url: string; pathname: string }[]> {
    const { blobs } = await list({ prefix })
    return blobs.map(b => ({ url: b.url, pathname: b.pathname }))
  }
}

// Local file storage for development
export class LocalFileStorage implements StorageService {
  private uploadsDir: string
  private baseUrl: string

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  async upload(file: File | Blob, filename: string): Promise<UploadResult> {
    // Ensure uploads directory exists
    if (!existsSync(this.uploadsDir)) {
      await mkdir(this.uploadsDir, { recursive: true })
    }

    // Create unique filename
    const id = Math.random().toString(36).substring(7)
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const pathname = `${id}-${safeFilename}`
    const filePath = path.join(this.uploadsDir, pathname)

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const url = `${this.baseUrl}/uploads/${pathname}`

    return {
      url,
      pathname,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    }
  }

  async delete(url: string): Promise<void> {
    const pathname = url.split('/uploads/').pop()
    if (pathname) {
      const filePath = path.join(this.uploadsDir, pathname)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    }
  }

  async list(prefix?: string): Promise<{ url: string; pathname: string }[]> {
    if (!existsSync(this.uploadsDir)) {
      return []
    }

    const files = await readdir(this.uploadsDir)
    return files
      .filter(f => !prefix || f.startsWith(prefix))
      .map(f => ({
        url: `${this.baseUrl}/uploads/${f}`,
        pathname: f,
      }))
  }
}

// Factory to get storage service based on environment - no caching for dev
export function getStorage(): StorageService {
  const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
  console.log(`[Storage] Using ${hasVercelBlob ? 'Vercel Blob' : 'Local File'} storage`)
  return hasVercelBlob ? new VercelBlobStorage() : new LocalFileStorage()
}

// Utility to compute file hash for deduplication
export async function computeFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  return generateFileHash(buffer)
}
