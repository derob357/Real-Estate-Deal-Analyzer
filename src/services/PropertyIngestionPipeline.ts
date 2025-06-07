import { CREPlatformScraper } from './CREPlatformScraper'
import { DataNormalizationService } from './DataNormalization'
import { JobQueueSystem } from './JobQueueSystem'
import { prisma } from '@/lib/database'

interface IngestionConfig {
  sources: string[]
  searchCriteria: any
  batchSize: number
  enableDeduplication: boolean
  enableValidation: boolean
  retryAttempts: number
}

interface IngestionResult {
  totalProcessed: number
  successfulInserts: number
  duplicatesSkipped: number
  errors: string[]
  processingTime: number
  statistics: {
    bySource: { [source: string]: number }
    byPropertyType: { [type: string]: number }
    averageConfidence: number
  }
}

export class PropertyIngestionPipeline {
  private static instance: PropertyIngestionPipeline
  private scraper: CREPlatformScraper
  private normalizer: DataNormalizationService
  private jobQueue: JobQueueSystem
  private isRunning = false

  static getInstance(): PropertyIngestionPipeline {
    if (!PropertyIngestionPipeline.instance) {
      PropertyIngestionPipeline.instance = new PropertyIngestionPipeline()
    }
    return PropertyIngestionPipeline.instance
  }

  constructor() {
    this.scraper = CREPlatformScraper.getInstance()
    this.normalizer = DataNormalizationService.getInstance()
    this.jobQueue = JobQueueSystem.getInstance()
  }

  async initialize(): Promise<void> {
    console.log('🔧 Initializing Property Ingestion Pipeline...')
    await this.scraper.initialize()
    console.log('✅ Pipeline initialized')
  }

  async ingestByZipCode(
    zipCode: string,
    config: Partial<IngestionConfig> = {}
  ): Promise<IngestionResult> {
    const fullConfig: IngestionConfig = {
      sources: ['LoopNet', 'Crexi', 'RealtyRates'],
      searchCriteria: { zipCode },
      batchSize: 50,
      enableDeduplication: true,
      enableValidation: true,
      retryAttempts: 3,
      ...config
    }

    console.log(`🏗️ Starting ingestion for ZIP code ${zipCode}`)
    const startTime = Date.now()

    try {
      // Step 1: Scrape data from all sources
      const scrapedData = await this.scrapeFromSources(fullConfig)
      console.log(`📊 Scraped ${scrapedData.length} properties from ${fullConfig.sources.length} sources`)

      // Step 2: Normalize and deduplicate
      const processedData = this.normalizer.processDataBatch(scrapedData)
      console.log(`🔄 Processed data: ${processedData.statistics.finalCount} unique properties`)

      // Step 3: Validate data
      const validatedData = fullConfig.enableValidation
        ? await this.validateProperties(processedData.deduplicatedProperties)
        : processedData.deduplicatedProperties

      // Step 4: Insert into database
      const insertResults = await this.insertProperties(validatedData, fullConfig.batchSize)

      const processingTime = Date.now() - startTime

      const result: IngestionResult = {
        totalProcessed: scrapedData.length,
        successfulInserts: insertResults.inserted,
        duplicatesSkipped: insertResults.skipped,
        errors: insertResults.errors,
        processingTime,
        statistics: {
          bySource: this.calculateSourceStats(scrapedData),
          byPropertyType: this.calculateTypeStats(validatedData),
          averageConfidence: processedData.statistics.averageConfidence
        }
      }

      console.log(`✅ Ingestion complete: ${result.successfulInserts} properties added`)
      return result

    } catch (error) {
      console.error(`❌ Ingestion failed for ZIP ${zipCode}:`, error)
      throw error
    }
  }

  private async scrapeFromSources(config: IngestionConfig): Promise<any[]> {
    const allProperties: any[] = []

    for (const source of config.sources) {
      try {
        console.log(`🔍 Scraping ${source}...`)

        let properties: any[] = []
        switch (source) {
          case 'LoopNet':
            const loopnetResult = await this.scraper.scrapeLoopNet(config.searchCriteria)
            properties = loopnetResult.properties
            break
          case 'Crexi':
            const crexiResult = await this.scraper.scrapeCrexi(config.searchCriteria)
            properties = crexiResult.properties
            break
          case 'RealtyRates':
            const realtyRatesResult = await this.scraper.scrapeRealtyRates(config.searchCriteria)
            properties = realtyRatesResult.properties
            break
          default:
            console.warn(`Unknown source: ${source}`)
            continue
        }

        allProperties.push(...properties)
        console.log(`✅ ${source}: ${properties.length} properties`)

        // Rate limiting between sources
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`❌ Failed to scrape ${source}:`, error)
      }
    }

    return allProperties
  }

  private async validateProperties(properties: any[]): Promise<any[]> {
    console.log('🔍 Validating properties...')

    const validProperties = properties.filter(property => {
      // Basic validation rules
      if (!property.address || property.address.length < 5) return false
      if (!property.listingPrice || property.listingPrice <= 0) return false
      if (!property.sqft || property.sqft <= 0) return false
      if (!property.city || !property.state) return false

      // Price reasonableness check
      const pricePerSqft = property.listingPrice / property.sqft
      if (pricePerSqft < 10 || pricePerSqft > 2000) return false

      return true
    })

    console.log(`✅ Validation complete: ${validProperties.length}/${properties.length} properties passed`)
    return validProperties
  }

  private async insertProperties(properties: any[], batchSize: number): Promise<{
    inserted: number
    skipped: number
    errors: string[]
  }> {
    console.log(`💾 Inserting ${properties.length} properties into database...`)

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    // Process in batches
    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize)

      for (const property of batch) {
        try {
          // Check if property already exists
          const existing = await prisma.property.findFirst({
            where: {
              address: property.normalizedAddress,
              city: property.city,
              state: property.state,
              zip_code: property.zipCode
            }
          })

          if (existing) {
            skipped++
            continue
          }

          // Insert new property
          await prisma.property.create({
            data: {
              address: property.normalizedAddress,
              city: property.city,
              state: property.state,
              zip_code: property.zipCode,
              property_type: property.propertyType,
              listing_price: property.listingPrice,
              sqft: property.sqft,
              listing_source: property.source,
              description: property.description || null,
              created_at: new Date(),
              updated_at: new Date()
            }
          })

          inserted++

        } catch (error) {
          const errorMsg = `Failed to insert property ${property.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      // Small delay between batches
      if (i + batchSize < properties.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { inserted, skipped, errors }
  }

  private calculateSourceStats(properties: any[]): { [source: string]: number } {
    const stats: { [source: string]: number } = {}
    for (const property of properties) {
      stats[property.source] = (stats[property.source] || 0) + 1
    }
    return stats
  }

  private calculateTypeStats(properties: any[]): { [type: string]: number } {
    const stats: { [type: string]: number } = {}
    for (const property of properties) {
      stats[property.propertyType] = (stats[property.propertyType] || 0) + 1
    }
    return stats
  }

  // Scheduled ingestion methods
  async scheduleRecurringIngestion(
    zipCodes: string[],
    intervalHours: number = 24,
    config: Partial<IngestionConfig> = {}
  ): Promise<string[]> {
    console.log(`⏰ Scheduling recurring ingestion for ${zipCodes.length} ZIP codes every ${intervalHours} hours`)

    const jobIds: string[] = []

    for (const zipCode of zipCodes) {
      const jobId = this.jobQueue.scheduleRecurringJob(
        'data_processing',
        {
          operation: 'ingestion',
          zipCode,
          config
        },
        intervalHours * 60 * 60 * 1000, // Convert to milliseconds
        2 // High priority
      )
      jobIds.push(jobId)
    }

    return jobIds
  }

  async ingestMultipleZipCodes(
    zipCodes: string[],
    config: Partial<IngestionConfig> = {}
  ): Promise<{ [zipCode: string]: IngestionResult }> {
    console.log(`🏗️ Starting bulk ingestion for ${zipCodes.length} ZIP codes`)

    const results: { [zipCode: string]: IngestionResult } = {}

    for (const zipCode of zipCodes) {
      try {
        console.log(`\n📍 Processing ZIP code ${zipCode}...`)
        results[zipCode] = await this.ingestByZipCode(zipCode, config)

        // Rate limiting between ZIP codes
        await new Promise(resolve => setTimeout(resolve, 3000))

      } catch (error) {
        console.error(`❌ Failed to ingest ZIP ${zipCode}:`, error)
        results[zipCode] = {
          totalProcessed: 0,
          successfulInserts: 0,
          duplicatesSkipped: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          processingTime: 0,
          statistics: {
            bySource: {},
            byPropertyType: {},
            averageConfidence: 0
          }
        }
      }
    }

    return results
  }

  // Market-focused ingestion
  async ingestMarketArea(
    city: string,
    state: string,
    config: Partial<IngestionConfig> = {}
  ): Promise<IngestionResult> {
    console.log(`🏙️ Starting market area ingestion for ${city}, ${state}`)

    const marketConfig: IngestionConfig = {
      sources: ['LoopNet', 'Crexi', 'RealtyRates'],
      searchCriteria: { city, state },
      batchSize: 100,
      enableDeduplication: true,
      enableValidation: true,
      retryAttempts: 3,
      ...config
    }

    return await this.ingestByLocation(city, state, marketConfig)
  }

  private async ingestByLocation(
    city: string,
    state: string,
    config: IngestionConfig
  ): Promise<IngestionResult> {
    const startTime = Date.now()

    try {
      // Get properties from scraper
      const scrapedData = await this.scraper.searchByLocation(city, state)
      console.log(`📊 Found ${scrapedData.length} properties in ${city}, ${state}`)

      // Process the data
      const processedData = this.normalizer.processDataBatch(scrapedData)

      // Validate and insert
      const validatedData = await this.validateProperties(processedData.deduplicatedProperties)
      const insertResults = await this.insertProperties(validatedData, config.batchSize)

      const processingTime = Date.now() - startTime

      return {
        totalProcessed: scrapedData.length,
        successfulInserts: insertResults.inserted,
        duplicatesSkipped: insertResults.skipped,
        errors: insertResults.errors,
        processingTime,
        statistics: {
          bySource: this.calculateSourceStats(scrapedData),
          byPropertyType: this.calculateTypeStats(validatedData),
          averageConfidence: processedData.statistics.averageConfidence
        }
      }

    } catch (error) {
      console.error(`❌ Location ingestion failed:`, error)
      throw error
    }
  }

  // Monitoring and status methods
  getIngestionStatus(): {
    isRunning: boolean
    queueStats: any
    recentResults: any[]
  } {
    return {
      isRunning: this.isRunning,
      queueStats: this.jobQueue.getQueueStats(),
      recentResults: [] // Would store recent ingestion results
    }
  }

  async getIngestionMetrics(): Promise<{
    totalProperties: number
    propertiesBySource: { [source: string]: number }
    propertiesByType: { [type: string]: number }
    recentIngestions: number
  }> {
    const totalProperties = await prisma.property.count()

    // Get properties by source (simplified query)
    const propertiesBySource: { [source: string]: number } = {}
    const propertiesByType: { [type: string]: number } = {}

    // Get recent ingestions (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const recentIngestions = await prisma.property.count({
      where: {
        created_at: {
          gte: yesterday
        }
      }
    })

    return {
      totalProperties,
      propertiesBySource,
      propertiesByType,
      recentIngestions
    }
  }
}
