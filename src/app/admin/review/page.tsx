'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import {
  Video,
  Download,
  Plus,
  Trash2,
  Upload,
  Send,
  CheckCircle,
  Play,
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface UploadedVideo {
  id: string
  filename: string
  blobUrl: string
  fileSize: number
  status: string
  createdAt: string
}

interface ExtractedProduct {
  id: string
  brandName: string
  productName: string
  gmv: number
  itemsSold: number
}

interface PendingCreator {
  id: string
  name: string
  tiktokHandle: string
  slug: string
  email: string | null
  createdAt: string
  videos: UploadedVideo[]
  extractedProducts: ExtractedProduct[]
}

export default function AdminReviewPage() {
  const [creators, setCreators] = useState<PendingCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCreator, setSelectedCreator] = useState<PendingCreator | null>(null)
  const [expandedCreators, setExpandedCreators] = useState<Set<string>>(new Set())

  // Video player state
  const [playingVideo, setPlayingVideo] = useState<UploadedVideo | null>(null)

  // Manual entry state
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProduct, setNewProduct] = useState({
    brandName: '',
    productName: '',
    gmv: '',
    itemsSold: '',
  })

  // CSV upload state
  const [showCsvUpload, setShowCsvUpload] = useState(false)
  const [csvData, setCsvData] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Send email state
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState<string | null>(null)

  async function loadCreators() {
    try {
      const response = await fetch('/api/admin/pending-creators')
      if (response.ok) {
        const data = await response.json()
        setCreators(data.creators)
      }
    } catch (err) {
      console.error('Failed to load creators:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCreators()
  }, [])

  const toggleCreator = (creatorId: string) => {
    const newExpanded = new Set(expandedCreators)
    if (newExpanded.has(creatorId)) {
      newExpanded.delete(creatorId)
    } else {
      newExpanded.add(creatorId)
    }
    setExpandedCreators(newExpanded)

    const creator = creators.find(c => c.id === creatorId)
    if (creator) {
      setSelectedCreator(creator)
    }
  }

  const handleAddProduct = async () => {
    if (!selectedCreator || !newProduct.brandName || !newProduct.productName) return

    try {
      const response = await fetch('/api/admin/add-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: selectedCreator.id,
          brandName: newProduct.brandName,
          productName: newProduct.productName,
          gmv: parseFloat(newProduct.gmv) || 0,
          itemsSold: parseInt(newProduct.itemsSold) || 0,
        }),
      })

      if (response.ok) {
        setNewProduct({ brandName: '', productName: '', gmv: '', itemsSold: '' })
        setShowAddProduct(false)
        loadCreators()
      }
    } catch (err) {
      console.error('Failed to add product:', err)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    try {
      await fetch(`/api/admin/delete-product/${productId}`, {
        method: 'DELETE',
      })
      loadCreators()
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  const handleCsvUpload = async () => {
    if (!selectedCreator || !csvData.trim()) return

    try {
      const response = await fetch('/api/admin/upload-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: selectedCreator.id,
          csvData: csvData,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setCsvData('')
        setShowCsvUpload(false)
        loadCreators()
        alert(`Successfully imported ${result.productsAdded} products`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to upload CSV:', err)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvData(text)
    }
    reader.readAsText(file)
  }

  const handleSendToCreator = async (creator: PendingCreator) => {
    if (!creator.email) {
      alert('Creator has no email address')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/admin/send-to-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: creator.id,
        }),
      })

      if (response.ok) {
        setSendSuccess(creator.id)
        setTimeout(() => setSendSuccess(null), 3000)
        loadCreators()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to send to creator:', err)
    } finally {
      setSending(false)
    }
  }

  const handleMarkComplete = async (creatorId: string) => {
    try {
      await fetch('/api/admin/mark-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      })
      loadCreators()
    } catch (err) {
      console.error('Failed to mark as reviewed:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Uploads</h1>
          <p className="text-gray-500">
            {creators.length} creator{creators.length !== 1 ? 's' : ''} pending review
          </p>
        </div>
      </div>

      {creators.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending uploads to review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {creators.map((creator) => {
            const isExpanded = expandedCreators.has(creator.id)
            const pendingVideos = creator.videos.filter(v => v.status === 'PENDING_REVIEW')

            return (
              <Card key={creator.id}>
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCreator(creator.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg">{creator.name}</CardTitle>
                        <p className="text-sm text-gray-500">@{creator.tiktokHandle}</p>
                      </div>
                      <Badge variant="secondary">
                        {pendingVideos.length} video{pendingVideos.length !== 1 ? 's' : ''}
                      </Badge>
                      {creator.extractedProducts.length > 0 && (
                        <Badge variant="success">
                          {creator.extractedProducts.length} product{creator.extractedProducts.length !== 1 ? 's' : ''} entered
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {creator.email && (
                        <span className="text-xs text-gray-400">{creator.email}</span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t pt-4 space-y-6">
                    {/* Videos Section */}
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Videos ({creator.videos.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {creator.videos.map((video) => (
                          <div
                            key={video.id}
                            className="border rounded-lg p-3 bg-gray-50"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium truncate flex-1 mr-2">
                                {video.filename}
                              </p>
                              <Badge variant={video.status === 'PENDING_REVIEW' ? 'warning' : 'success'} className="text-xs">
                                {video.status === 'PENDING_REVIEW' ? 'Pending' : 'Reviewed'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                              {(video.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setPlayingVideo(video)}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Play
                              </Button>
                              <a
                                href={video.blobUrl}
                                download={video.filename}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="secondary">
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Products Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Products ({creator.extractedProducts.length})
                        </h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedCreator(creator)
                              setShowCsvUpload(true)
                            }}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Upload CSV
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCreator(creator)
                              setShowAddProduct(true)
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Product
                          </Button>
                        </div>
                      </div>

                      {creator.extractedProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="text-left p-2 font-medium">Brand</th>
                                <th className="text-left p-2 font-medium">Product</th>
                                <th className="text-right p-2 font-medium">GMV</th>
                                <th className="text-right p-2 font-medium">Units</th>
                                <th className="w-10"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {creator.extractedProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                  <td className="p-2">{product.brandName || 'Unknown'}</td>
                                  <td className="p-2">{product.productName}</td>
                                  <td className="p-2 text-right">${product.gmv.toLocaleString()}</td>
                                  <td className="p-2 text-right">{product.itemsSold.toLocaleString()}</td>
                                  <td className="p-2">
                                    <button
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No products entered yet. Add manually or upload a CSV.
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button
                        variant="secondary"
                        onClick={() => handleMarkComplete(creator.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Reviewed
                      </Button>

                      {creator.extractedProducts.length > 0 && creator.email && (
                        <Button
                          onClick={() => handleSendToCreator(creator)}
                          disabled={sending}
                        >
                          {sendSuccess === creator.id ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Sent!
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send to Creator
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Video Player Modal */}
      <Modal
        isOpen={!!playingVideo}
        onClose={() => setPlayingVideo(null)}
        title={playingVideo?.filename || 'Video Player'}
        size="lg"
      >
        {playingVideo && (
          <div className="space-y-4">
            <video
              src={playingVideo.blobUrl}
              controls
              autoPlay
              className="w-full rounded-lg"
              style={{ maxHeight: '60vh' }}
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {(playingVideo.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
              <a
                href={playingVideo.blobUrl}
                download={playingVideo.filename}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        title="Add Product"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Brand Name"
            value={newProduct.brandName}
            onChange={(e) => setNewProduct(prev => ({ ...prev, brandName: e.target.value }))}
            placeholder="e.g., BarkBox"
          />
          <Input
            label="Product Name"
            value={newProduct.productName}
            onChange={(e) => setNewProduct(prev => ({ ...prev, productName: e.target.value }))}
            placeholder="e.g., Dog Chew Toy Set"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="GMV ($)"
              type="number"
              value={newProduct.gmv}
              onChange={(e) => setNewProduct(prev => ({ ...prev, gmv: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Units Sold"
              type="number"
              value={newProduct.itemsSold}
              onChange={(e) => setNewProduct(prev => ({ ...prev, itemsSold: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddProduct(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>
              Add Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        isOpen={showCsvUpload}
        onClose={() => {
          setShowCsvUpload(false)
          setCsvData('')
        }}
        title="Upload CSV"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <strong>CSV Format:</strong> brandName, productName, gmv, itemsSold
            </p>
            <p className="text-xs text-gray-500">
              Example: BarkBox, Dog Chew Toy Set, 5000, 250
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose CSV File
            </Button>
          </div>

          <div className="relative">
            <p className="text-sm text-gray-500 text-center my-2">or paste CSV data below</p>
          </div>

          <Textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="brandName, productName, gmv, itemsSold&#10;BarkBox, Dog Chew Toy Set, 5000, 250&#10;..."
            rows={10}
            className="font-mono text-sm"
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => {
              setShowCsvUpload(false)
              setCsvData('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleCsvUpload} disabled={!csvData.trim()}>
              Import Products
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
