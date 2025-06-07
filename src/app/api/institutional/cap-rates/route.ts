import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const zipCode = searchParams.get('zipCode');
    const propertyType = searchParams.get('propertyType');
    const includeTrends = searchParams.get('includeTrends') === 'true';

    // Build where clause for properties
    const whereClause: any = {
      asking_cap_rate: {
        not: null
      }
    };

    if (zipCode) {
      whereClause.zip_code = zipCode;
    }

    if (propertyType) {
      whereClause.property_type = {
        contains: propertyType
      };
    }

    // Get cap rates from property listings
    const propertyCapRates = await prisma.property.groupBy({
      by: ['property_type'],
      where: whereClause,
      _avg: {
        asking_cap_rate: true
      },
      _count: {
        asking_cap_rate: true
      },
      _min: {
        asking_cap_rate: true
      },
      _max: {
        asking_cap_rate: true
      }
    });

    // Aggregate cap rates by property type
    const capRatesByType = propertyCapRates.map(item => ({
      propertyType: item.property_type || 'unknown',
      avgCapRate: item._avg.asking_cap_rate || 0,
      minCapRate: item._min.asking_cap_rate || 0,
      maxCapRate: item._max.asking_cap_rate || 0,
      dataPoints: item._count.asking_cap_rate || 0,
      sources: ['Direct Listings'],
      totalCount: item._count.asking_cap_rate || 0
    }));

    // Calculate market statistics
    const marketStats = calculateMarketStats(capRatesByType);

    // Mock trends data for now
    let trends = null;
    if (includeTrends) {
      trends = {
        monthlyData: [],
        trendDirection: 'stable',
        dataAvailability: 'limited'
      };
    }

    // Format response
    const response = {
      capRates: {
        byPropertyType: capRatesByType.map(item => ({
          ...item,
          avgCapRate: item.avgCapRate * 100, // Convert to percentage
          ranges: {
            min: item.minCapRate ? item.minCapRate * 100 : null,
            max: item.maxCapRate ? item.maxCapRate * 100 : null
          }
        })),
        bySource: [{
          source: 'Direct Listings',
          avgCapRate: marketStats.overallAvgCapRate * 100,
          dataPoints: marketStats.totalDataPoints,
          propertyTypes: capRatesByType.map(item => item.propertyType),
          totalCount: marketStats.totalDataPoints
        }]
      },
      marketStats: {
        ...marketStats,
        overallAvgCapRate: marketStats.overallAvgCapRate * 100,
        spread: {
          min: marketStats.spread.min * 100,
          max: marketStats.spread.max * 100,
          range: (marketStats.spread.max - marketStats.spread.min) * 100
        }
      },
      trends,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataPoints: marketStats.totalDataPoints,
        sources: ['Direct Listings'],
        dateRange: {
          from: null,
          to: null
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching cap rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cap rates' },
      { status: 500 }
    );
  }
}

function calculateMarketStats(capRatesByType: any[]) {
  if (capRatesByType.length === 0) {
    return {
      overallAvgCapRate: 0,
      spread: { min: 0, max: 0 },
      mostActiveType: null,
      totalDataPoints: 0
    };
  }

  const allRates = capRatesByType.map(item => item.avgCapRate).filter(rate => rate > 0);
  const overallAvgCapRate = allRates.length > 0 ? allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length : 0;
  const minRate = allRates.length > 0 ? Math.min(...allRates) : 0;
  const maxRate = allRates.length > 0 ? Math.max(...allRates) : 0;
  const mostActiveType = capRatesByType.length > 0 ? capRatesByType[0].propertyType : null;
  const totalDataPoints = capRatesByType.reduce((sum, item) => sum + item.dataPoints, 0);

  return {
    overallAvgCapRate,
    spread: { min: minRate, max: maxRate },
    mostActiveType,
    totalDataPoints
  };
}
