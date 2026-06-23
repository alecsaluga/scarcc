import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Delete a product and its associated opportunity
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // First delete the opportunity that references this product
    await prisma.opportunity.deleteMany({
      where: { extractedProductId: id },
    })

    // Then delete the product
    await prisma.extractedProduct.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
