import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      property_data,
      financials,
      include_tax_data = true,
      force_refresh_tax = false
    } = body

    // Validate required inputs
    if (!property_data?.address) {
      return NextResponse.json(
        { error: 'Property address is required' },
        { status: 400 }
      )
    }

    if (!financials?.purchasePrice || !financials?.grossRentalIncome) {
      return NextResponse.json(
        { error: 'Purchase price and gross rental income are required' },
        { status: 400 }
      )
    }

    // Simulate enhanced analysis with mock data
    const mockAnalysis = {
      property: {
        id: '1',
        address: property_data.address,
        city: property_data.city || 'Demo City',
        state: property_data.state || 'CA',
        zip_code: property_data.zip_code || '12345',
        property_type: property_data.property_type || 'multifamily',
        units: property_data.units || 24,
        sqft: property_data.sqft || 18000,
        year_built: property_data.year_built || 1995
      },
      financials: {
        purchasePrice: financials.purchasePrice,
        grossRentalIncome: financials.grossRentalIncome,
        monthlyRent: financials.grossRentalIncome / 12,
        estimatedExpenses: financials.grossRentalIncome * 0.35, // 35% expense ratio
        noi: financials.grossRentalIncome * 0.65, // 65% NOI
        capRate: (financials.grossRentalIncome * 0.65) / financials.purchasePrice,
        cashOnCash: 0.08, // 8% mock cash-on-cash return
        dscr: 1.25, // Debt service coverage ratio
        grm: financials.purchasePrice / financials.grossRentalIncome
      },
      marketData: {
        averageCapRate: 0.055,
        marketRentPsf: 2.85,
        occupancyRate: 0.94,
        marketTrends: 'stable',
        comparableProperties: 8,
        pricePerSqft: financials.purchasePrice / (property_data.sqft || 18000)
      },
      taxData: include_tax_data ? {
        assessedValue: financials.purchasePrice * 0.85,
        landValue: financials.purchasePrice * 0.25,
        improvementValue: financials.purchasePrice * 0.60,
        annualTaxes: financials.purchasePrice * 0.0125, // 1.25% tax rate
        taxRate: 0.0125,
        exemptions: [],
        lastAssessment: new Date().getFullYear()
      } : null,
      analysis: {
        investmentGrade: 'B+',
        riskScore: 3.2, // out of 5
        recommendedAction: 'Consider Purchase',
        keyMetrics: {
          pricePerUnit: financials.purchasePrice / (property_data.units || 24),
          rentMultiplier: financials.purchasePrice / financials.grossRentalIncome,
          breakEvenOccupancy: 0.72,
          irr: 0.125 // 12.5% IRR estimate
        },
        risks: [
          'Market concentration in single asset class',
          'Age of property may require capital improvements',
          'Interest rate sensitivity'
        ],
        opportunities: [
          'Below-market rents with upside potential',
          'Strong demographic trends in area',
          'Potential for value-add improvements'
        ]
      },
      comparables: [
        {
          address: '456 Oak St',
          distance: 0.3,
          soldPrice: financials.purchasePrice * 1.1,
          capRate: 0.052,
          pricePerSqft: (financials.purchasePrice * 1.1) / 19000
        },
        {
          address: '789 Pine Ave',
          distance: 0.7,
          soldPrice: financials.purchasePrice * 0.95,
          capRate: 0.058,
          pricePerSqft: (financials.purchasePrice * 0.95) / 16500
        }
      ],
      dataSource: 'Demo/Mock Data',
      timestamp: new Date().toISOString(),
      analysisId: `analysis_${Date.now()}`
    }

    return NextResponse.json({
      success: true,
      analysis: mockAnalysis,
      message: 'Enhanced analysis completed using demo data'
    })

  } catch (error) {
    console.error('Enhanced analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze property', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving saved analyses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const limit = Number.parseInt(searchParams.get('limit') || '10')

    if (propertyId) {
      // Get analyses for specific property
      const analyses = await prisma.underwritingAnalysis.findMany({
        where: { property_id: propertyId },
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          property: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
              zip_code: true
            }
          }
        }
      })

      return NextResponse.json({ analyses })
    } else {
      // Get recent analyses across all properties
      const analyses = await prisma.underwritingAnalysis.findMany({
        orderBy: { created_at: 'desc' },
        take: limit,
        include: {
          property: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
              zip_code: true
            }
          }
        }
      })

      return NextResponse.json({ analyses })
    }

  } catch (error) {
    console.error('Error fetching analyses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
