import { NextResponse } from 'next/server'
import { put, list } from '@vercel/blob'
import { prisma } from '@/lib/db'

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  }

  // Check 1: Environment variables
  results.checks = {
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'MISSING',
    DATABASE_URL: !!process.env.DATABASE_URL ? 'SET' : 'MISSING',
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY ? 'SET' : 'MISSING',
    AI_PROVIDER: process.env.AI_PROVIDER || 'not set',
  }

  // Check 2: Database connection
  try {
    const count = await prisma.creator.count()
    results.database = { status: 'OK', creatorCount: count }
  } catch (e) {
    results.database = { status: 'ERROR', error: e instanceof Error ? e.message : String(e) }
  }

  // Check 3: Blob storage - try to list files
  try {
    const { blobs } = await list({ limit: 1 })
    results.blobList = { status: 'OK', blobCount: blobs.length }
  } catch (e) {
    results.blobList = { status: 'ERROR', error: e instanceof Error ? e.message : String(e) }
  }

  // Check 4: Blob storage - try to upload a tiny test file
  try {
    const testContent = `Test file created at ${new Date().toISOString()}`
    const blob = await put('debug-test.txt', testContent, {
      access: 'public',
      addRandomSuffix: true,
    })
    results.blobUpload = { status: 'OK', url: blob.url }
  } catch (e) {
    results.blobUpload = { status: 'ERROR', error: e instanceof Error ? e.message : String(e) }
  }

  return NextResponse.json(results, { status: 200 })
}
