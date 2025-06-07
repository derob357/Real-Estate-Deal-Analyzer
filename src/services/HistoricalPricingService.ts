import { prisma } from '@/lib/database'

interface PricePoint {
  date: Date
  price: number
  source: string
  pricePerSqft?: number
}

interface PricingHistory {
  propertyId: string
  address: string
  city: string
  state: string
  zipCode: string
  priceHistory: PricePoint[]
  currentPrice: number
  priceChange: {
    amount: number
    percentage: number
    period: string
  }
  trends: {
    trend: 'rising' | 'falling' | 'stable'
    confidence: number
    volatility: number
  }
}

interface MarketTrend {
  zipCode: string
  period: string
  averagePriceChange: number
  medianPriceChange: number
  propertyCount: number
  trendDirection: 'rising' | 'falling' | 'stable'
}

export class HistoricalPricingService {
  private static instance: HistoricalPricingService

  static getInstance(): HistoricalPricingService {
    if (!HistoricalPricingService.instance) {
      HistoricalPricingService.instance = new HistoricalPricingService()
    }
    return HistoricalPricingService.instance
  }

  async trackPriceChange(
    propertyId: string,
    newPrice: number,
    source: string,
    sqft?: number
  ): Promise<void> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      })

      if (!property) {
        throw new Error(`Property ${propertyId} not found`)
      }

      // Update current listing price
      await prisma.property.update({
        where: { id: propertyId },
        data: {
          listing_price: newPrice,
          updated_at: new Date()
        }
      })

      console.log(`📈 Price updated for ${property.address}: $${newPrice.toLocaleString()}`)

    } catch (error) {
      console.error('Failed to track price change:', error)
    }
  }

  async getPropertyPricingHistory(propertyId: string): Promise<PricingHistory | null> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      })

      if (!property) {
        return null
      }

      // Generate mock historical data for demonstration
      const priceHistory = this.generateMockPriceHistory(
        property.listing_price || 1000000,
        property.created_at
      )

      const currentPrice = property.listing_price || 0
      const firstPrice = priceHistory[0]?.price || currentPrice
      const priceChange = {
        amount: currentPrice - firstPrice,
        percentage: firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0,
        period: '12 months'
      }

      const trends = this.analyzePriceTrends(priceHistory)

      return {
        propertyId,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zip_code,
        priceHistory,
        currentPrice,
        priceChange,
        trends
      }

    } catch (error) {
      console.error('Failed to get pricing history:', error)
      return null
    }
  }

  private generateMockPriceHistory(currentPrice: number, startDate: Date): PricePoint[] {
    const history: PricePoint[] = []
    const monthsBack = 12
    const now = new Date()

    for (let i = monthsBack; i >= 0; i--) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - i)

      // Generate realistic price variation (±5% from trend)
      const trendMultiplier = 1 + (Math.random() - 0.5) * 0.1 // ±5%
      const basePrice = currentPrice * (0.95 + (monthsBack - i) * 0.004) // Slight upward trend
      const price = Math.round(basePrice * trendMultiplier)

      history.push({
        date,
        price,
        source: i === 0 ? 'Current' : 'Historical',
        pricePerSqft: Math.round(price / 10000) // Rough estimate
      })
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  private analyzePriceTrends(priceHistory: PricePoint[]): {
    trend: 'rising' | 'falling' | 'stable'
    confidence: number
    volatility: number
  } {
    if (priceHistory.length < 2) {
      return { trend: 'stable', confidence: 0, volatility: 0 }
    }

    const prices = priceHistory.map(p => p.price)
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    const totalChange = (lastPrice - firstPrice) / firstPrice

    // Calculate volatility (standard deviation)
    const changes = []
    for (let i = 1; i < prices.length; i++) {
      changes.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }

    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length
    const volatility = Math.sqrt(variance) * 100

    let trend: 'rising' | 'falling' | 'stable'
    if (totalChange > 0.02) trend = 'rising'
    else if (totalChange < -0.02) trend = 'falling'
    else trend = 'stable'

    const confidence = Math.max(0, Math.min(100, 100 - volatility * 10))

    return {
      trend,
      confidence: Math.round(confidence),
      volatility: Math.round(volatility * 100) / 100
    }
  }

  async getMarketTrends(zipCode: string, period: string = '12m'): Promise<MarketTrend | null> {
    try {
      const properties = await prisma.property.findMany({
        where: { zip_code: zipCode },
        orderBy: { updated_at: 'desc' }
      })

      if (properties.length === 0) {
        return null
      }

      // Calculate market-wide price changes
      const priceChanges: number[] = []

      for (const property of properties) {
        // Mock calculation - in real implementation would use actual historical data
        const mockPriceChange = (Math.random() - 0.5) * 0.2 // ±10%
        priceChanges.push(mockPriceChange)
      }

      const averagePriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length
      const sortedChanges = [...priceChanges].sort((a, b) => a - b)
      const medianPriceChange = sortedChanges[Math.floor(sortedChanges.length / 2)]

      let trendDirection: 'rising' | 'falling' | 'stable'
      if (averagePriceChange > 0.02) trendDirection = 'rising'
      else if (averagePriceChange < -0.02) trendDirection = 'falling'
      else trendDirection = 'stable'

      return {
        zipCode,
        period,
        averagePriceChange: Math.round(averagePriceChange * 10000) / 100, // Percentage
        medianPriceChange: Math.round(medianPriceChange * 10000) / 100,
        propertyCount: properties.length,
        trendDirection
      }

    } catch (error) {
      console.error('Failed to get market trends:', error)
      return null
    }
  }

  async getComparativePricing(propertyId: string, radius: number = 5): Promise<{
    targetProperty: any
    comparables: any[]
    pricePosition: 'above' | 'below' | 'average'
    percentileSummary: string
  } | null> {
    try {
      const targetProperty = await prisma.property.findUnique({
        where: { id: propertyId }
      })

      if (!targetProperty) {
        return null
      }

      // Get comparable properties (simplified - same ZIP code)
      const comparables = await prisma.property.findMany({
        where: {
          zip_code: targetProperty.zip_code,
          property_type: targetProperty.property_type,
          id: { not: propertyId },
          listing_price: { not: null },
          sqft: { not: null }
        },
        take: 20,
        orderBy: { updated_at: 'desc' }
      })

      if (comparables.length === 0) {
        return {
          targetProperty,
          comparables: [],
          pricePosition: 'average',
          percentileSummary: 'Insufficient comparable data'
        }
      }

      // Calculate price position
      const targetPricePerSqft = (targetProperty.listing_price || 0) / (targetProperty.sqft || 1)
      const comparablePrices = comparables
        .map(p => (p.listing_price || 0) / (p.sqft || 1))
        .sort((a, b) => a - b)

      const position = comparablePrices.findIndex(price => price > targetPricePerSqft)
      const percentile = position === -1 ? 100 : (position / comparablePrices.length) * 100

      let pricePosition: 'above' | 'below' | 'average'
      if (percentile > 75) pricePosition = 'above'
      else if (percentile < 25) pricePosition = 'below'
      else pricePosition = 'average'

      const percentileSummary = `${Math.round(percentile)}th percentile of comparable properties`

      return {
        targetProperty,
        comparables,
        pricePosition,
        percentileSummary
      }

    } catch (error) {
      console.error('Failed to get comparative pricing:', error)
      return null
    }
  }

  async scheduleMarketUpdate(zipCode: string): Promise<string> {
    console.log(`⏰ Scheduling market update for ZIP ${zipCode}`)

    // In a real implementation, this would queue a background job
    const updateId = `market_update_${zipCode}_${Date.now()}`

    // Simulate scheduling
    setTimeout(async () => {
      try {
        console.log(`🔄 Running market update for ZIP ${zipCode}`)
        const trends = await this.getMarketTrends(zipCode)
        console.log(`✅ Market update complete for ZIP ${zipCode}`, trends)
      } catch (error) {
        console.error(`❌ Market update failed for ZIP ${zipCode}:`, error)
      }
    }, 5000)

    return updateId
  }

  async generatePricingReport(zipCode: string): Promise<{
    summary: MarketTrend
    topPerformers: any[]
    bottomPerformers: any[]
    insights: string[]
  } | null> {
    try {
      const marketTrend = await this.getMarketTrends(zipCode)
      if (!marketTrend) return null

      const properties = await prisma.property.findMany({
        where: { zip_code: zipCode },
        take: 50,
        orderBy: { updated_at: 'desc' }
      })

      // Mock performance data
      const performanceData = properties.map(property => ({
        ...property,
        performanceScore: Math.random() * 100
      }))

      const topPerformers = performanceData
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, 5)

      const bottomPerformers = performanceData
        .sort((a, b) => a.performanceScore - b.performanceScore)
        .slice(0, 5)

      const insights = [
        `Market is ${marketTrend.trendDirection} with ${marketTrend.averagePriceChange.toFixed(1)}% average price change`,
        `${marketTrend.propertyCount} properties analyzed in ZIP ${zipCode}`,
        `Top performers showing ${topPerformers[0]?.performanceScore.toFixed(1)}% above market average`,
        marketTrend.trendDirection === 'rising'
          ? 'Consider timing purchases for better value'
          : 'Current market conditions favor buyers'
      ]

      return {
        summary: marketTrend,
        topPerformers,
        bottomPerformers,
        insights
      }

    } catch (error) {
      console.error('Failed to generate pricing report:', error)
      return null
    }
  }
}
