// Mock database service for deployment where SQLite isn't available
export const mockPrisma = {
  property: {
    findFirst: async () => ({
      id: '1',
      address: '123 Main St',
      city: 'Demo City',
      state: 'CA',
      zip_code: '12345',
      property_type: 'multifamily',
      property_sub_type: 'garden_style',
      units: 24,
      sqft: 18000,
      lot_size: 25000,
      year_built: 1995,
      listing_price: 2800000,
      asking_cap_rate: 0.055,
      noi: 156000,
      gross_income: 240000,
      description: 'Demo property for testing',
      features: JSON.stringify(['parking', 'laundry', 'pool']),
      images: JSON.stringify([]),
      latitude: 34.0522,
      longitude: -118.2437,
      created_at: new Date(),
      updated_at: new Date(),
      taxAssessments: [
        {
          id: '1',
          assessedValue: 2800000,
          taxYear: 2024,
          landValue: 800000,
          improvementValue: 2000000,
          totalTaxes: 35000
        }
      ],
      underwritingAnalyses: []
    }),
    findMany: async (options: any) => {
      const properties = Array.from({ length: Math.min(options?.take || 10, 5) }, (_, i) => ({
        id: `${i + 1}`,
        address: `${123 + i} Demo St`,
        city: 'Demo City',
        state: 'CA',
        zip_code: '12345',
        property_type: 'multifamily',
        property_sub_type: 'garden_style',
        units: 24 + i * 4,
        sqft: 18000 + i * 2000,
        lot_size: 25000 + i * 3000,
        year_built: 1995 + i,
        listing_price: 2800000 + i * 200000,
        asking_cap_rate: 0.055 + i * 0.005,
        noi: 156000 + i * 10000,
        gross_income: 240000 + i * 15000,
        description: `Demo property ${i + 1} for testing`,
        features: JSON.stringify(['parking', 'laundry', 'pool']),
        images: JSON.stringify([]),
        created_at: new Date(),
        updated_at: new Date()
      }))
      return properties
    },
    count: async () => 25,
    create: async (data: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      ...data.data,
      created_at: new Date(),
      updated_at: new Date()
    }),
    update: async (options: any) => ({
      id: options.where?.id || '1',
      ...options.data,
      updated_at: new Date()
    }),
    delete: async (options: any) => ({
      id: options.where?.id || '1'
    }),
    deleteMany: async () => ({ count: 0 }),
    upsert: async (options: any) => ({
      id: options.where?.id || Math.random().toString(36).substr(2, 9),
      ...options.create,
      updated_at: new Date()
    })
  },
  underwritingAnalysis: {
    create: async (data: any) => ({
      id: '1',
      ...data,
      created_at: new Date()
    }),
    findMany: async () => [],
    findFirst: async () => null,
    update: async (options: any) => ({
      id: options.where?.id || '1',
      ...options.data,
      updated_at: new Date()
    }),
    delete: async (options: any) => ({
      id: options.where?.id || '1'
    }),
    deleteMany: async () => ({ count: 0 })
  },
  // Tax assessment tables
  taxAssessment: {
    create: async (data: any) => ({ id: '1', ...data, created_at: new Date() }),
    findMany: async () => [],
    findFirst: async () => null,
    update: async (options: any) => ({ id: options.where?.id || '1', ...options.data }),
    delete: async () => ({ id: '1' }),
    deleteMany: async () => ({ count: 0 })
  },
  taxPayment: {
    create: async (data: any) => ({ id: '1', ...data, created_at: new Date() }),
    findMany: async () => [],
    findFirst: async () => null,
    update: async (options: any) => ({ id: options.where?.id || '1', ...options.data }),
    delete: async () => ({ id: '1' }),
    deleteMany: async () => ({ count: 0 })
  },
  taxAssessorSource: {
    create: async (data: any) => ({ id: '1', ...data, created_at: new Date() }),
    findMany: async () => [],
    findFirst: async () => null,
    update: async (options: any) => ({ id: options.where?.id || '1', ...options.data }),
    delete: async () => ({ id: '1' }),
    deleteMany: async () => ({ count: 0 })
  },
  zipCodeMapping: {
    create: async (data: any) => ({ id: '1', ...data, created_at: new Date() }),
    findMany: async () => [],
    findFirst: async () => null,
    update: async (options: any) => ({ id: options.where?.id || '1', ...options.data }),
    delete: async () => ({ id: '1' }),
    deleteMany: async () => ({ count: 0 })
  },
  address: {
    create: async (data: any) => ({ id: '1', ...data, created_at: new Date() }),
    findMany: async () => [],
    findFirst: async () => null,
    update: async (options: any) => ({ id: options.where?.id || '1', ...options.data }),
    delete: async () => ({ id: '1' }),
    deleteMany: async () => ({ count: 0 })
  },
  scrapeJob: {
    create: async (data: any) => ({ id: '1', ...data, created_at: new Date() }),
    findMany: async () => [],
    findFirst: async () => null,
    update: async (options: any) => ({ id: options.where?.id || '1', ...options.data }),
    delete: async () => ({ id: '1' }),
    deleteMany: async () => ({ count: 0 })
  },
  // Institutional tables
  institutionalScrapeJob: {
    create: async (data: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      ...data.data || data,
      created_at: new Date(),
      updated_at: new Date()
    }),
    findMany: async (options: any) => {
      const jobs = Array.from({ length: Math.min(options?.take || 10, 3) }, (_, i) => ({
        id: `job-${i + 1}`,
        source: 'demo_source',
        job_type: 'properties',
        status: 'completed',
        search_params: '{}',
        results: '{}',
        validation_errors: null,
        processing_time_ms: 5000 + i * 1000,
        data_quality_score: 0.85 + i * 0.05,
        results_count: 10 + i * 5,
        created_at: new Date(),
        updated_at: new Date()
      }))
      return jobs
    },
    findFirst: async () => null,
    update: async (options: any) => ({
      id: options.where?.id || '1',
      ...options.data,
      updated_at: new Date()
    }),
    delete: async (options: any) => ({
      id: options.where?.id || '1'
    }),
    deleteMany: async () => ({ count: 0 }),
    count: async () => 5,
    groupBy: async (options: any) => {
      if (options.by.includes('status')) {
        return [
          { status: 'completed', _count: { _all: 3 } },
          { status: 'pending', _count: { _all: 1 } },
          { status: 'failed', _count: { _all: 1 } }
        ]
      }
      if (options.by.includes('source')) {
        return [
          { source: 'demo_source', _count: { _all: 5 }, _avg: { processing_time_ms: 6000, data_quality_score: 0.88 } }
        ]
      }
      if (options.by.includes('job_type')) {
        return [
          { job_type: 'properties', _count: { _all: 3 }, _avg: { results_count: 12 } },
          { job_type: 'market_data', _count: { _all: 2 }, _avg: { results_count: 8 } }
        ]
      }
      return []
    }
  },
  institutionalMarketData: {
    findMany: async () => [
      {
        id: '1',
        metro_area: 'Los Angeles Metro',
        zip_code: '12345',
        source: 'Demo MLS',
        measurement_date: new Date(),
        multifamily_cap_rate: 0.055,
        office_cap_rate: 0.065,
        retail_cap_rate: 0.075,
        industrial_cap_rate: 0.045,
        hotel_cap_rate: 0.085,
      }
    ]
  },
  institutionalProperty: {
    groupBy: async () => [
      {
        property_type: 'multifamily',
        source: 'Demo MLS',
        _avg: { cap_rate: 0.055 },
        _count: { cap_rate: 10 }
      }
    ]
  },
  institutionalTransaction: {
    groupBy: async () => [
      {
        property_type: 'office',
        source: 'Demo Source',
        _avg: { cap_rate: 0.065 },
        _count: { cap_rate: 5 }
      }
    ]
  },
  $queryRaw: async () => [
    {
      month: '2024-01',
      multifamily_avg: 0.055,
      office_avg: 0.065,
      retail_avg: 0.075,
      industrial_avg: 0.045,
      data_points: 25
    }
  ],
  $connect: async () => {},
  $disconnect: async () => {},
  // Generic methods for any missing table
  $executeRaw: async () => ({ count: 0 }),
  $executeRawUnsafe: async () => ({ count: 0 }),
  $queryRawUnsafe: async () => []
}

export function shouldUseMockDatabase() {
  return process.env.NODE_ENV === 'production' && (!process.env.DATABASE_URL || process.env.DATABASE_URL === "" || !process.env.DATABASE_URL?.startsWith('postgresql'))
}

// Create a generic mock table for any missing Prisma models
const createMockTable = () => ({
  create: async (data: any) => ({ id: Math.random().toString(36).substr(2, 9), ...data.data || data, created_at: new Date() }),
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  update: async (options: any) => ({ id: options.where?.id || '1', ...options.data, updated_at: new Date() }),
  delete: async (options: any) => ({ id: options.where?.id || '1' }),
  deleteMany: async () => ({ count: 0 }),
  upsert: async (options: any) => ({ id: options.where?.id || Math.random().toString(36).substr(2, 9), ...options.create, updated_at: new Date() }),
  count: async () => 0,
  groupBy: async () => [],
  aggregate: async () => ({ _count: { _all: 0 }, _avg: {}, _sum: {}, _min: {}, _max: {} })
})

// Add a proxy to handle any missing table methods
export const mockPrismaProxy = new Proxy(mockPrisma, {
  get(target, prop) {
    if (prop in target) {
      return target[prop as keyof typeof target]
    }
    // Return a mock table for any missing property
    return createMockTable()
  }
})
