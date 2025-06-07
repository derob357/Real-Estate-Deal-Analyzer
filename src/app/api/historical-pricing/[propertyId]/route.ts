import { NextRequest, NextResponse } from 'next/server'
import { HistoricalPricingService } from '@/services/HistoricalPricingService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params
    const pricingService = HistoricalPricingService.getInstance()

    const pricingHistory = await pricingService.getPropertyPricingHistory(propertyId)

    if (!pricingHistory) {
      return NextResponse.json(
        { error: 'Property not found or no pricing history available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: pricingHistory
    })

  } catch (error) {
    console.error('Historical pricing API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve pricing history' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params
    const body = await request.json()
    const { price, source, sqft } = body

    if (!price || !source) {
      return NextResponse.json(
        { error: 'Price and source are required' },
        { status: 400 }
      )
    }

    const pricingService = HistoricalPricingService.getInstance()
    await pricingService.trackPriceChange(propertyId, price, source, sqft)

    return NextResponse.json({
      success: true,
      message: 'Price change tracked successfully'
    })

  } catch (error) {
    console.error('Price tracking API error:', error)
    return NextResponse.json(
      { error: 'Failed to track price change' },
      { status: 500 }
    )
  }
}
