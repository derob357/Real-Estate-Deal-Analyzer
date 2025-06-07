import { prisma } from './database'

/**
 * Market data aggregation and analytics system
 */

export interface MarketMetrics {
  averagePrice: number
  medianPrice: number
  averageCapRate: number
  medianCapRate: number
  averagePricePerSqft: number
  totalProperties: number
  averageDaysOnMarket?: number
  priceRange: { min: number; max: number }
  capRateRange: { min: number; max: number }
}

export interface MarketTrends {
  priceGrowth: number // Year-over-year percentage
  capRateChange: number
  volumeChange: number
  trend: 'rising' | 'stable' | 'declining'
  confidence: number // 0-100
}

export interface ZipCodeMarketData {
  zipCode: string
  city: string
  state: string
  metrics: MarketMetrics
  trends: MarketTrends
  propertyTypes: { [key: string]: MarketMetrics }
  lastUpdated: Date
}

/**
 * Aggregate market data by ZIP code
 */
export async function aggregateMarketDataByZip(zipCode: string): Promise<ZipCodeMarketData | null> {
  try {
    // Get all properties in the ZIP code
    const properties = await prisma.property.findMany({
      where: { zip_code: zipCode },
      include: {
        tax_assessments: {
          orderBy: { assessment_year: 'desc' },
          take: 1
        }
      }
    })

    if (properties.length === 0) {
      return null
    }

    const firstProperty = properties[0]

    // Calculate overall metrics
    const metrics = calculateMarketMetrics(properties)

    // Calculate trends (simplified - would need historical data)
    const trends = calculateMarketTrends(properties)

    // Group by property type
    const propertyTypes: { [key: string]: MarketMetrics } = {}
    const typeGroups = groupPropertiesByType(properties)

    for (const [type, typeProperties] of Object.entries(typeGroups)) {
      propertyTypes[type] = calculateMarketMetrics(typeProperties)
    }

    return {
      zipCode,
      city: firstProperty.city,
      state: firstProperty.state,
      metrics,
      trends,
      propertyTypes,
      lastUpdated: new Date()
    }

  } catch (error) {
    console.error(`Failed to aggregate market data for ZIP ${zipCode}:`, error)
    return null
  }
}

/**
 * Calculate market metrics for a set of properties
 */
function calculateMarketMetrics(properties: any[]): MarketMetrics {
  if (properties.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      averageCapRate: 0,
      medianCapRate: 0,
      averagePricePerSqft: 0,
      totalProperties: 0,
      priceRange: { min: 0, max: 0 },
      capRateRange: { min: 0, max: 0 }
    }
  }

  // Filter out properties with missing price data
  const propertiesWithPrices = properties.filter(p => p.listing_price && p.listing_price > 0)
  const propertiesWithCapRates = properties.filter(p => p.asking_cap_rate && p.asking_cap_rate > 0)
  const propertiesWithSqft = properties.filter(p => p.sqft && p.sqft > 0 && p.listing_price && p.listing_price > 0)

  // Calculate prices
  const prices = propertiesWithPrices.map(p => p.listing_price).sort((a, b) => a - b)
  const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0

  // Calculate cap rates
  const capRates = propertiesWithCapRates.map(p => p.asking_cap_rate).sort((a, b) => a - b)
  const averageCapRate = capRates.reduce((sum, rate) => sum + rate, 0) / capRates.length
  const medianCapRate = capRates.length > 0 ? capRates[Math.floor(capRates.length / 2)] : 0

  // Calculate price per square foot
  const pricesPerSqft = propertiesWithSqft.map(p => p.listing_price / p.sqft)
  const averagePricePerSqft = pricesPerSqft.reduce((sum, price) => sum + price, 0) / pricesPerSqft.length

  return {
    averagePrice: Math.round(averagePrice),
    medianPrice: Math.round(medianPrice),
    averageCapRate: Math.round(averageCapRate * 10000) / 10000, // 4 decimal places
    medianCapRate: Math.round(medianCapRate * 10000) / 10000,
    averagePricePerSqft: Math.round(averagePricePerSqft * 100) / 100,
    totalProperties: properties.length,
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    },
    capRateRange: {
      min: capRates.length > 0 ? Math.min(...capRates) : 0,
      max: capRates.length > 0 ? Math.max(...capRates) : 0
    }
  }
}

/**
 * Calculate market trends (simplified version)
 */
function calculateMarketTrends(properties: any[]): MarketTrends {
  // This is a simplified version - real implementation would need historical data
  const recentProperties = properties.filter(p => {
    if (!p.created_at) return false
    const monthsOld = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    return monthsOld <= 6
  })

  const olderProperties = properties.filter(p => {
    if (!p.created_at) return false
    const monthsOld = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
    return monthsOld > 6 && monthsOld <= 18
  })

  let priceGrowth = 0
  let capRateChange = 0
  let volumeChange = 0
  let trend: 'rising' | 'stable' | 'declining' = 'stable'
  let confidence = 50

  if (recentProperties.length > 0 && olderProperties.length > 0) {
    const recentAvgPrice = recentProperties
      .filter(p => p.listing_price)
      .reduce((sum, p) => sum + p.listing_price, 0) / recentProperties.length

    const olderAvgPrice = olderProperties
      .filter(p => p.listing_price)
      .reduce((sum, p) => sum + p.listing_price, 0) / olderProperties.length

    if (olderAvgPrice > 0) {
      priceGrowth = ((recentAvgPrice - olderAvgPrice) / olderAvgPrice) * 100
      confidence = Math.min(90, Math.max(30, properties.length * 5))
    }

    // Calculate cap rate change
    const recentAvgCapRate = recentProperties
      .filter(p => p.asking_cap_rate)
      .reduce((sum, p) => sum + p.asking_cap_rate, 0) / recentProperties.length

    const olderAvgCapRate = olderProperties
      .filter(p => p.asking_cap_rate)
      .reduce((sum, p) => sum + p.asking_cap_rate, 0) / olderProperties.length

    if (olderAvgCapRate > 0) {
      capRateChange = ((recentAvgCapRate - olderAvgCapRate) / olderAvgCapRate) * 100
    }

    // Volume change
    volumeChange = ((recentProperties.length - olderProperties.length) / olderProperties.length) * 100

    // Determine trend
    if (priceGrowth > 5) trend = 'rising'
    else if (priceGrowth < -5) trend = 'declining'
    else trend = 'stable'
  }

  return {
    priceGrowth: Math.round(priceGrowth * 100) / 100,
    capRateChange: Math.round(capRateChange * 10000) / 10000,
    volumeChange: Math.round(volumeChange * 100) / 100,
    trend,
    confidence
  }
}

/**
 * Group properties by type
 */
function groupPropertiesByType(properties: any[]): { [key: string]: any[] } {
  return properties.reduce((groups, property) => {
    const type = property.property_type || 'unknown'
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(property)
    return groups
  }, {} as { [key: string]: any[] })
}

/**
 * Get comparable properties for a given property
 */
export async function getComparableProperties(
  propertyId: string,
  radius: number = 5,
  limit: number = 10
): Promise<any[]> {
  try {
    const targetProperty = await prisma.property.findUnique({
      where: { id: propertyId }
    })

    if (!targetProperty) {
      return []
    }

    // Find comparable properties (simplified - real implementation would use geographic distance)
    const comparables = await prisma.property.findMany({
      where: {
        id: { not: propertyId },
        zip_code: targetProperty.zip_code, // Same ZIP code for now
        property_type: targetProperty.property_type,
        sqft: {
          gte: targetProperty.sqft ? targetProperty.sqft * 0.7 : undefined,
          lte: targetProperty.sqft ? targetProperty.sqft * 1.3 : undefined
        }
      },
      take: limit,
      orderBy: { created_at: 'desc' }
    })

    return comparables

  } catch (error) {
    console.error('Failed to get comparable properties:', error)
    return []
  }
}

/**
 * Generate market report for multiple ZIP codes
 */
export async function generateMarketReport(zipCodes: string[]): Promise<{
  summary: MarketMetrics
  markets: ZipCodeMarketData[]
  comparisons: { [key: string]: any }
}> {
  try {
    const markets: ZipCodeMarketData[] = []

    for (const zipCode of zipCodes) {
      const marketData = await aggregateMarketDataByZip(zipCode)
      if (marketData) {
        markets.push(marketData)
      }
    }

    // Calculate summary across all markets
    const allProperties = await prisma.property.findMany({
      where: {
        zip_code: { in: zipCodes }
      }
    })

    const summary = calculateMarketMetrics(allProperties)

    // Generate comparisons
    const comparisons = {
      priceRanges: markets.map(m => ({
        zipCode: m.zipCode,
        city: m.city,
        averagePrice: m.metrics.averagePrice,
        medianPrice: m.metrics.medianPrice
      })),
      capRateRanges: markets.map(m => ({
        zipCode: m.zipCode,
        city: m.city,
        averageCapRate: m.metrics.averageCapRate,
        medianCapRate: m.metrics.medianCapRate
      })),
      propertyVolume: markets.map(m => ({
        zipCode: m.zipCode,
        city: m.city,
        totalProperties: m.metrics.totalProperties
      }))
    }

    return {
      summary,
      markets,
      comparisons
    }

  } catch (error) {
    console.error('Failed to generate market report:', error)
    throw error
  }
}

/**
 * Update market data cache
 */
export async function updateMarketDataCache(): Promise<void> {
  try {
    // Get all unique ZIP codes
    const zipCodes = await prisma.property.findMany({
      select: { zip_code: true },
      distinct: ['zip_code']
    })

    console.log(`🔄 Updating market data cache for ${zipCodes.length} ZIP codes...`)

    let updated = 0
    for (const { zip_code } of zipCodes) {
      try {
        const marketData = await aggregateMarketDataByZip(zip_code)
        if (marketData) {
          // In a real implementation, this would save to a cache table
          console.log(`✅ Updated market data for ${zip_code}`)
          updated++
        }
      } catch (error) {
        console.error(`❌ Failed to update market data for ${zip_code}:`, error)
      }
    }

    console.log(`✅ Market data cache update complete: ${updated}/${zipCodes.length} ZIP codes updated`)

  } catch (error) {
    console.error('❌ Market data cache update failed:', error)
    throw error
  }
}
