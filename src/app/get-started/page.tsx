'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Upload, Video, CheckCircle, AlertCircle, X } from 'lucide-react'
import { upload } from '@vercel/blob/client'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface UploadedBlob {
  url: string
  filename: string
  size: number
  contentType: string
}

export default function GetStartedPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [tiktokHandle, setTiktokHandle] = useState('')
  const [email, setEmail] = useState('')
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.m4v', '.mpeg', '.mpg', '.3gp', '.mkv', '.ogg', '.wmv']

  // Full-page drag and drop
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (uploadState === 'idle') {
        setIsDragging(true)
      }
    }

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault()
      if (e.relatedTarget === null) {
        setIsDragging(false)
      }
    }

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (uploadState !== 'idle') return

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        validateAndAddFiles(files)
      }
    }

    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('drop', handleWindowDrop)

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('dragleave', handleWindowDragLeave)
      window.removeEventListener('drop', handleWindowDrop)
    }
  }, [uploadState])

  const validateAndAddFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const validFiles: File[] = []

    for (const file of fileArray) {
      const hasVideoType = file.type.startsWith('video/') || file.type === 'application/octet-stream'
      const hasVideoExtension = videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

      if (hasVideoType || hasVideoExtension) {
        validFiles.push(file)
      }
    }

    if (validFiles.length === 0) {
      setError('Please select video files only')
      return
    }

    setVideoFiles(prev => [...prev, ...validFiles])
    setError(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      validateAndAddFiles(files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (uploadState === 'idle') {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (uploadState !== 'idle') return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      validateAndAddFiles(files)
    }
  }

  const removeFile = (index: number) => {
    setVideoFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (!tiktokHandle.trim()) {
      setError('Please enter your TikTok handle')
      return
    }

    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    if (videoFiles.length === 0) {
      setError('Please select at least one video file')
      return
    }

    setUploadState('uploading')
    setCurrentFileIndex(0)

    try {
      // Upload all videos directly to Vercel Blob (client-side)
      const uploadedBlobs: UploadedBlob[] = []

      for (let i = 0; i < videoFiles.length; i++) {
        setCurrentFileIndex(i)
        const file = videoFiles[i]

        // Generate a simple safe filename
        const safeFilename = `upload_${Date.now()}_${i}.mp4`

        const blob = await upload(safeFilename, file, {
          access: 'public',
          handleUploadUrl: '/api/upload-token',
        })

        uploadedBlobs.push({
          url: blob.url,
          filename: file.name,
          size: file.size,
          contentType: file.type || 'video/mp4',
        })
      }

      // Send to simple upload endpoint (no AI processing)
      const response = await fetch('/api/upload-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          tiktokHandle: tiktokHandle.trim().replace('@', ''),
          email: email.trim(),
          videos: uploadedBlobs,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      setUploadState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadState('error')
    }
  }

  const resetForm = () => {
    setUploadState('idle')
    setError(null)
    setVideoFiles([])
    setCurrentFileIndex(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const totalSize = videoFiles.reduce((sum, f) => sum + f.size, 0)

  return (
    <>
      {/* Full-page drop overlay */}
      {isDragging && uploadState === 'idle' && (
        <div className="fixed inset-0 bg-brand-500/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl p-8 shadow-2xl border-4 border-dashed border-brand-500">
            <Upload className="h-16 w-16 text-brand-500 mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-900">Drop your videos here</p>
          </div>
        </div>
      )}

      <div className="creator-shell min-h-screen bg-white flex items-center justify-center p-5">
        <div className="w-full max-w-[680px]">
          <div className="creator-panel">
            {/* Logo */}
            <div className="creator-brand-header">
              <Image
                src="/assets/retainergoat-logo.png"
                alt="RetainerGoat"
                width={340}
                height={80}
                className="creator-brand-logo"
                priority
              />
            </div>

            {uploadState === 'success' ? (
              <div className="creator-card text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ letterSpacing: '-0.04em' }}>
                  Upload Complete!
                </h2>
                <p className="question-copy mx-auto mb-4">
                  Thanks for submitting your TikTok Shop data. Our team will review your videos and send you an email with next steps within 24-48 hours.
                </p>
                <p className="text-sm text-gray-500">
                  Check your email at <strong>{email}</strong> for updates.
                </p>
              </div>
            ) : uploadState === 'error' ? (
              <div className="creator-card text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2" style={{ letterSpacing: '-0.04em' }}>
                  Upload Failed
                </h2>
                <p className="text-red-600 mb-6">{error}</p>
                <button onClick={resetForm} className="btn-creator-secondary">
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div className="question-block" style={{ paddingTop: '20px' }}>
                  <h1 className="creator-title">
                    Upload Your TikTok Shop Data
                  </h1>
                  <p className="question-copy">
                    Share screen recordings of your last 90 days of TikTok Shop analytics. We'll review and reach out with next steps.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="creator-card space-y-4 mt-4">
                  <div className="field">
                    <label className="mono-label">Your Name</label>
                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      disabled={uploadState !== 'idle'}
                    />
                  </div>

                  <div className="field">
                    <label className="mono-label">TikTok Handle</label>
                    <input
                      type="text"
                      name="tiktokHandle"
                      value={tiktokHandle}
                      onChange={(e) => setTiktokHandle(e.target.value)}
                      placeholder="@yourhandle"
                      disabled={uploadState !== 'idle'}
                    />
                  </div>

                  <div className="field">
                    <label className="mono-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      disabled={uploadState !== 'idle'}
                    />
                  </div>

                  <div className="field">
                    <label className="mono-label">Screen Recordings</label>

                    {/* Selected files list */}
                    {videoFiles.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {videoFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl"
                          >
                            <Video className="h-5 w-5 text-brand-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            {uploadState === 'idle' && (
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <p className="text-xs text-gray-500 text-right">
                          {videoFiles.length} file{videoFiles.length !== 1 ? 's' : ''} • {(totalSize / (1024 * 1024)).toFixed(2)} MB total
                        </p>
                      </div>
                    )}

                    {/* Drag & drop / file select area */}
                    <div
                      className={`creator-file-upload ${
                        uploadState !== 'idle' ? 'pointer-events-none opacity-50' : ''
                      } ${isDragging ? 'border-brand-500 bg-brand-50' : ''}`}
                      onClick={() => uploadState === 'idle' && fileInputRef.current?.click()}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploadState !== 'idle'}
                      />
                      <span className="creator-file-upload-button">
                        <Upload className="h-5 w-5 mr-2" />
                        {isDragging ? 'Drop files here' : videoFiles.length > 0 ? 'Add More Files' : 'Choose Files'}
                      </span>
                      {!isDragging && videoFiles.length === 0 && (
                        <span className="text-gray-400">or drag and drop</span>
                      )}
                    </div>
                  </div>

                  {error && uploadState === 'idle' && (
                    <div className="form-alert">{error}</div>
                  )}

                  <button
                    type="submit"
                    className="btn-creator-primary w-full"
                    disabled={uploadState !== 'idle'}
                  >
                    {uploadState === 'uploading'
                      ? `Uploading Video ${currentFileIndex + 1} of ${videoFiles.length}...`
                      : `Submit${videoFiles.length > 0 ? ` (${videoFiles.length} video${videoFiles.length !== 1 ? 's' : ''})` : ''}`}
                  </button>

                  {uploadState === 'uploading' && (
                    <div className="mt-4">
                      <div className="creator-processing-meter">
                        <span className="creator-processing-meter-fill" />
                      </div>
                      <p className="text-sm text-gray-500 text-center mt-3">
                        Uploading video {currentFileIndex + 1} of {videoFiles.length}...
                      </p>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
