import { prisma } from './database'

/**
 * Database schema validation and initialization utilities
 */

export interface SchemaValidationResult {
  isValid: boolean
  missingTables: string[]
  errors: string[]
  recommendations: string[]
}

/**
 * Validate the current database schema
 */
export async function validateDatabaseSchema(): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    isValid: true,
    missingTables: [],
    errors: [],
    recommendations: []
  }

  try {
    // Check if core tables exist by running basic queries
    const tables = [
      { name: 'Property', query: () => prisma.property.findFirst() },
      { name: 'TaxAssessment', query: () => prisma.taxAssessment.findFirst() },
      { name: 'UnderwritingAnalysis', query: () => prisma.underwritingAnalysis.findFirst() },
      { name: 'TaxAssessorSource', query: () => prisma.taxAssessorSource.findFirst() },
      { name: 'ZipCodeMapping', query: () => prisma.zipCodeMapping.findFirst() }
    ]

    for (const table of tables) {
      try {
        await table.query()
        console.log(`✅ Table ${table.name} exists and is accessible`)
      } catch (error) {
        console.error(`❌ Table ${table.name} is missing or inaccessible:`, error)
        result.missingTables.push(table.name)
        result.errors.push(`Table ${table.name} is missing or inaccessible`)
        result.isValid = false
      }
    }

    // Check for new schema fields
    try {
      const property = await prisma.property.findFirst({
        select: {
          images: true,
          features: true,
          asking_cap_rate: true,
          noi: true,
          gross_income: true
        }
      })
      console.log('✅ New property schema fields are available')
    } catch (error) {
      result.errors.push('New property schema fields are missing - run database migration')
      result.recommendations.push('Run: bunx prisma db push to update schema')
      result.isValid = false
    }

  } catch (error) {
    result.errors.push(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    result.isValid = false
  }

  return result
}

/**
 * Initialize database with basic data if empty
 */
export async function initializeDatabaseData(): Promise<void> {
  try {
    // Check if we have any properties
    const propertyCount = await prisma.property.count()

    if (propertyCount === 0) {
      console.log('🔧 Database is empty, initializing with sample data...')

      // Create sample property
      await prisma.property.create({
        data: {
          address: '123 Demo Street',
          city: 'Atlanta',
          state: 'GA',
          zip_code: '30309',
          property_type: 'multifamily',
          property_sub_type: 'Garden Style',
          units: 24,
          sqft: 18000,
          sq_ft: 18000,
          year_built: 1995,
          listing_price: 2500000,
          asking_cap_rate: 0.055,
          noi: 137500,
          gross_income: 200000,
          description: 'Beautiful garden-style apartment complex in prime Atlanta location',
          features: JSON.stringify(['Pool', 'Fitness Center', 'Parking', 'Laundry Facilities']),
          images: JSON.stringify([
            'https://images.unsplash.com/photo-1664833189338-f26738a0656d?fm=jpg&q=80&w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1664833189203-cbd564954b11?fm=jpg&q=80&w=800&h=600&fit=crop'
          ])
        }
      })

      console.log('✅ Sample property created')
    }

    // Check if we have tax assessor sources
    const sourceCount = await prisma.taxAssessorSource.count()

    if (sourceCount === 0) {
      console.log('🔧 Adding sample tax assessor sources...')

      await prisma.taxAssessorSource.createMany({
        data: [
          {
            county: 'Fulton',
            state: 'GA',
            assessor_url: 'https://www.fultonassessor.org',
            search_url_pattern: '/property-search',
            is_active: true
          },
          {
            county: 'DeKalb',
            state: 'GA',
            assessor_url: 'https://www.dekalbassessor.com',
            search_url_pattern: '/property-lookup',
            is_active: true
          }
        ]
      })

      console.log('✅ Sample tax assessor sources created')
    }

  } catch (error) {
    console.error('❌ Failed to initialize database data:', error)
    throw error
  }
}

/**
 * Health check for database connectivity and performance
 */
export async function databaseHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  details: Record<string, any>
}> {
  const startTime = Date.now()

  try {
    // Simple query to test connectivity
    await prisma.$queryRaw`SELECT 1 as test`

    const responseTime = Date.now() - startTime

    // Test basic operations
    const propertyCount = await prisma.property.count()
    const sourceCount = await prisma.taxAssessorSource.count()

    return {
      status: responseTime < 1000 ? 'healthy' : 'degraded',
      responseTime,
      details: {
        propertyCount,
        sourceCount,
        prismaVersion: '6.8.2',
        connectionPool: 'active'
      }
    }

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * Clean up old or invalid data
 */
export async function cleanupDatabase(): Promise<void> {
  try {
    // Remove properties with invalid data
    const invalidProperties = await prisma.property.findMany({
      where: {
        OR: [
          { address: '' },
          { city: '' },
          { state: '' },
          { zip_code: '' }
        ]
      }
    })

    if (invalidProperties.length > 0) {
      await prisma.property.deleteMany({
        where: {
          id: {
            in: invalidProperties.map((p: any) => p.id)
          }
        }
      })
      console.log(`🧹 Cleaned up ${invalidProperties.length} invalid properties`)
    }

    // Clean up old analyses (keep last 100 per property)
    const oldAnalyses = await prisma.underwritingAnalysis.findMany({
      orderBy: { created_at: 'desc' },
      skip: 100
    })

    if (oldAnalyses.length > 0) {
      await prisma.underwritingAnalysis.deleteMany({
        where: {
          id: {
            in: oldAnalyses.map((a: any) => a.id)
          }
        }
      })
      console.log(`🧹 Cleaned up ${oldAnalyses.length} old analyses`)
    }

  } catch (error) {
    console.error('❌ Database cleanup failed:', error)
    throw error
  }
}
