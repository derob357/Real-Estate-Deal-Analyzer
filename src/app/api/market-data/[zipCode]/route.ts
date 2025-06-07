import { NextRequest, NextResponse } from 'next/server'
import { aggregateMarketDataByZip } from '@/lib/market-data-aggregator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zipCode: string }> }
) {
  try {
    const { zipCode } = await params

    if (!zipCode || zipCode.length !== 5) {
      return NextResponse.json(
        { error: 'Valid 5-digit ZIP code is required' },
        { status: 400 }
      )
    }

    const marketData = await aggregateMarketDataByZip(zipCode)

    if (!marketData) {
      return NextResponse.json(
        {
          error: 'No market data found for this ZIP code',
          zipCode
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      zipCode,
      marketData
    })

  } catch (error) {
    console.error('Market data aggregation error:', error)
    return NextResponse.json(
      { error: 'Failed to aggregate market data' },
      { status: 500 }
    )
  }
}
