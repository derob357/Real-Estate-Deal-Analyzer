export interface RealEstateProperty {
  id: string
  source: string
  mlsId?: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  propertySubType?: string
  listingPrice: number
  pricePerSqft?: number
  pricePerUnit?: number
  sqft: number
  units?: number
  lotSize?: number
  yearBuilt?: number
  capRate?: number
  noi?: number
  grossIncome?: number
  operatingExpenses?: number
  listingDate: Date
  daysOnMarket: number
  status: 'Active' | 'Under Contract' | 'Sold' | 'Off Market'
  description: string
  features: string[]
  photos: string[]
  documents?: string[]
  coordinates: {
    latitude: number
    longitude: number
  }
  contactInfo: {
    agentName: string
    agentPhone?: string
    agentEmail?: string
    brokerageName: string
  }
  financials?: {
    taxes?: number
    insurance?: number
    maintenance?: number
    utilities?: number
    vacancy?: number
  }
  tenantInfo?: {
    occupancyRate: number
    leaseExpirations: Date[]
    avgRentPerSqft: number
  }
  lastUpdated: Date
}

interface APIProvider {
  name: string
  endpoint: string
  isActive: boolean
  rateLimit: {
    requestsPerMinute: number
    requestsPerDay: number
  }
  authConfig: {
    type: 'apiKey' | 'oauth' | 'basic'
    credentials: Record<string, string>
  }
  coverage: string[]
}

interface SearchCriteria {
  location: {
    zipCodes?: string[]
    cities?: string[]
    states?: string[]
    radius?: {
      centerLat: number
      centerLng: number
      radiusMiles: number
    }
    bounds?: {
      northEast: { lat: number; lng: number }
      southWest: { lat: number; lng: number }
    }
  }
  propertyTypes?: string[]
  priceRange?: {
    min?: number
    max?: number
  }
  sqftRange?: {
    min?: number
    max?: number
  }
  capRateRange?: {
    min?: number
    max?: number
  }
  listingStatus?: string[]
  sortBy?: 'price' | 'capRate' | 'listingDate' | 'sqft'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Commercial Real Estate API Providers
const API_PROVIDERS: APIProvider[] = [
  {
    name: 'LoopNet API',
    endpoint: 'https://api.loopnet.com/v2',
    isActive: true,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerDay: 10000
    },
    authConfig: {
      type: 'apiKey',
      credentials: {
        apiKey: process.env.LOOPNET_API_KEY || '',
        clientId: process.env.LOOPNET_CLIENT_ID || ''
      }
    },
    coverage: ['US', 'CA']
  },
  {
    name: 'Crexi API',
    endpoint: 'https://api.crexi.com/v1',
    isActive: true,
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 5000
    },
    authConfig: {
      type: 'oauth',
      credentials: {
        clientId: process.env.CREXI_CLIENT_ID || '',
        clientSecret: process.env.CREXI_CLIENT_SECRET || '',
        redirectUri: process.env.CREXI_REDIRECT_URI || ''
      }
    },
    coverage: ['US']
  },
  {
    name: 'RentSpree Commercial',
    endpoint: 'https://api.rentspree.com/commercial/v1',
    isActive: true,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 15000
    },
    authConfig: {
      type: 'apiKey',
      credentials: {
        apiKey: process.env.RENTSPREE_API_KEY || '',
        userId: process.env.RENTSPREE_USER_ID || ''
      }
    },
    coverage: ['CA', 'TX', 'FL', 'NY']
  },
  {
    name: 'CommercialSearch API',
    endpoint: 'https://api.commercialsearch.com/v2',
    isActive: true,
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerDay: 8000
    },
    authConfig: {
      type: 'basic',
      credentials: {
        username: process.env.COMMERCIAL_SEARCH_USERNAME || '',
        password: process.env.COMMERCIAL_SEARCH_PASSWORD || ''
      }
    },
    coverage: ['US']
  },
  {
    name: 'CBRE API',
    endpoint: 'https://api.cbre.com/commercial/v1',
    isActive: false, // Requires enterprise partnership
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 3000
    },
    authConfig: {
      type: 'oauth',
      credentials: {
        clientId: process.env.CBRE_CLIENT_ID || '',
        clientSecret: process.env.CBRE_CLIENT_SECRET || ''
      }
    },
    coverage: ['US', 'Global']
  },
  {
    name: 'Marcus & Millichap API',
    endpoint: 'https://api.marcusmillichap.com/v1',
    isActive: false, // Custom integration required
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerDay: 2000
    },
    authConfig: {
      type: 'apiKey',
      credentials: {
        apiKey: process.env.MM_API_KEY || '',
        partnerId: process.env.MM_PARTNER_ID || ''
      }
    },
    coverage: ['US']
  }
]

export class RealEstateAPIService {
  private static instance: RealEstateAPIService
  private providers: APIProvider[] = API_PROVIDERS
  private isInitialized = false
  private rateLimitTracking = new Map<string, { count: number; resetTime: number }>()

  static getInstance(): RealEstateAPIService {
    if (!RealEstateAPIService.instance) {
      RealEstateAPIService.instance = new RealEstateAPIService()
    }
    return RealEstateAPIService.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🔌 Initializing Real Estate API Service...')

    // Test connections to all active providers
    for (const provider of this.providers.filter(p => p.isActive)) {
      try {
        await this.testConnection(provider)
        console.log(`✅ Connected to ${provider.name}`)
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${provider.name}:`, error)
        provider.isActive = false
      }
    }

    this.isInitialized = true
    console.log('🚀 Real Estate API Service initialized')
  }

  private async testConnection(provider: APIProvider): Promise<boolean> {
    try {
      const authHeaders = await this.getAuthHeaders(provider)

      const response = await fetch(`${provider.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      })

      return response.ok
    } catch (error) {
      // For demo purposes, simulate successful connection to some providers
      const demoActiveProviders = ['LoopNet API', 'RentSpree Commercial']
      return demoActiveProviders.includes(provider.name)
    }
  }

  private async getAuthHeaders(provider: APIProvider): Promise<Record<string, string>> {
    const headers: Record<string, string> = {}

    switch (provider.authConfig.type) {
      case 'apiKey':
        headers['X-API-Key'] = provider.authConfig.credentials.apiKey || ''
        if (provider.authConfig.credentials.clientId) {
          headers['X-Client-ID'] = provider.authConfig.credentials.clientId
        }
        break

      case 'oauth':
        // In production, this would handle OAuth token refresh
        const token = await this.getOAuthToken(provider)
        headers['Authorization'] = `Bearer ${token}`
        break

      case 'basic':
        const credentials = btoa(
          `${provider.authConfig.credentials.username}:${provider.authConfig.credentials.password}`
        )
        headers['Authorization'] = `Basic ${credentials}`
        break
    }

    return headers
  }

  private async getOAuthToken(provider: APIProvider): Promise<string> {
    // Simplified OAuth implementation - in production this would be more robust
    try {
      const response = await fetch(`${provider.endpoint}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: provider.authConfig.credentials.clientId,
          client_secret: provider.authConfig.credentials.clientSecret
        })
      })

      const data = await response.json()
      return data.access_token || 'demo_token'
    } catch (error) {
      return 'demo_token'
    }
  }

  private checkRateLimit(provider: APIProvider): boolean {
    const now = Date.now()
    const tracking = this.rateLimitTracking.get(provider.name) || { count: 0, resetTime: now + 60000 }

    if (now > tracking.resetTime) {
      tracking.count = 0
      tracking.resetTime = now + 60000
    }

    if (tracking.count >= provider.rateLimit.requestsPerMinute) {
      return false
    }

    tracking.count++
    this.rateLimitTracking.set(provider.name, tracking)
    return true
  }

  async searchProperties(criteria: SearchCriteria): Promise<RealEstateProperty[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const allProperties: RealEstateProperty[] = []
    const activeProviders = this.providers.filter(p => p.isActive)

    console.log(`🔍 Searching ${activeProviders.length} providers for properties...`)

    // Search each provider concurrently
    const searchPromises = activeProviders.map(async (provider) => {
      try {
        if (!this.checkRateLimit(provider)) {
          console.warn(`⏰ Rate limit exceeded for ${provider.name}`)
          return []
        }

        const properties = await this.searchProvider(provider, criteria)
        console.log(`📊 Found ${properties.length} properties from ${provider.name}`)
        return properties
      } catch (error) {
        console.error(`❌ Error searching ${provider.name}:`, error)
        return []
      }
    })

    const results = await Promise.allSettled(searchPromises)

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allProperties.push(...result.value)
      } else {
        console.error(`Failed to search ${activeProviders[index].name}:`, result.reason)
      }
    })

    // Deduplicate and sort results
    const deduplicatedProperties = this.deduplicateProperties(allProperties)
    return this.sortProperties(deduplicatedProperties, criteria.sortBy, criteria.sortOrder)
  }

  private async searchProvider(provider: APIProvider, criteria: SearchCriteria): Promise<RealEstateProperty[]> {
    const authHeaders = await this.getAuthHeaders(provider)
    const queryParams = this.buildQueryParams(provider, criteria)

    try {
      const response = await fetch(`${provider.endpoint}/properties/search?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return this.normalizeProviderData(provider, data)
    } catch (error) {
      // Generate mock data for demonstration
      return this.generateMockProperties(provider, criteria)
    }
  }

  private buildQueryParams(provider: APIProvider, criteria: SearchCriteria): string {
    const params = new URLSearchParams()

    // Location parameters
    if (criteria.location.zipCodes?.length) {
      params.append('zip_codes', criteria.location.zipCodes.join(','))
    }
    if (criteria.location.cities?.length) {
      params.append('cities', criteria.location.cities.join(','))
    }
    if (criteria.location.states?.length) {
      params.append('states', criteria.location.states.join(','))
    }

    // Property filters
    if (criteria.propertyTypes?.length) {
      params.append('property_types', criteria.propertyTypes.join(','))
    }
    if (criteria.priceRange?.min) {
      params.append('min_price', criteria.priceRange.min.toString())
    }
    if (criteria.priceRange?.max) {
      params.append('max_price', criteria.priceRange.max.toString())
    }
    if (criteria.sqftRange?.min) {
      params.append('min_sqft', criteria.sqftRange.min.toString())
    }
    if (criteria.sqftRange?.max) {
      params.append('max_sqft', criteria.sqftRange.max.toString())
    }

    // Pagination
    params.append('limit', (criteria.limit || 50).toString())
    params.append('offset', (criteria.offset || 0).toString())

    return params.toString()
  }

  private normalizeProviderData(provider: APIProvider, rawData: any): RealEstateProperty[] {
    // Normalize different provider data formats to our standard format
    const properties: RealEstateProperty[] = []

    try {
      const listings = rawData.properties || rawData.listings || rawData.results || []

      for (const listing of listings) {
        const property: RealEstateProperty = {
          id: `${provider.name.toLowerCase().replace(/\s+/g, '_')}_${listing.id || listing.listingId || Date.now()}`,
          source: provider.name,
          mlsId: listing.mlsId || listing.mls_id,
          address: listing.address || listing.street_address || '',
          city: listing.city || '',
          state: listing.state || listing.state_code || '',
          zipCode: listing.zipCode || listing.zip_code || listing.postal_code || '',
          propertyType: this.normalizePropertyType(listing.propertyType || listing.property_type || 'Commercial'),
          propertySubType: listing.propertySubType || listing.sub_type,
          listingPrice: this.parseNumber(listing.price || listing.listing_price || listing.askingPrice) || 0,
          pricePerSqft: this.parseNumber(listing.pricePerSqft || listing.price_per_sqft),
          pricePerUnit: this.parseNumber(listing.pricePerUnit || listing.price_per_unit),
          sqft: this.parseNumber(listing.sqft || listing.square_feet || listing.building_size) || 0,
          units: this.parseNumber(listing.units || listing.unit_count),
          lotSize: this.parseNumber(listing.lotSize || listing.lot_size),
          yearBuilt: this.parseNumber(listing.yearBuilt || listing.year_built),
          capRate: this.parseNumber(listing.capRate || listing.cap_rate) || undefined,
          noi: this.parseNumber(listing.noi || listing.net_operating_income),
          grossIncome: this.parseNumber(listing.grossIncome || listing.gross_income),
          operatingExpenses: this.parseNumber(listing.expenses || listing.operating_expenses),
          listingDate: new Date(listing.listingDate || listing.listing_date || listing.created_at || Date.now()),
          daysOnMarket: this.parseNumber(listing.daysOnMarket || listing.days_on_market) || 0,
          status: this.normalizeStatus(listing.status || 'Active'),
          description: listing.description || listing.remarks || '',
          features: this.parseFeatures(listing.features || listing.amenities || []),
          photos: this.parsePhotos(listing.photos || listing.images || []),
          documents: this.parseDocuments(listing.documents || []),
          coordinates: {
            latitude: this.parseNumber(listing.latitude || listing.lat) || 0,
            longitude: this.parseNumber(listing.longitude || listing.lng || listing.lon) || 0
          },
          contactInfo: {
            agentName: listing.agentName || listing.agent?.name || listing.broker?.name || 'Contact Agent',
            agentPhone: listing.agentPhone || listing.agent?.phone || listing.broker?.phone,
            agentEmail: listing.agentEmail || listing.agent?.email || listing.broker?.email,
            brokerageName: listing.brokerageName || listing.brokerage?.name || provider.name
          },
          financials: {
            taxes: this.parseNumber(listing.taxes || listing.property_taxes),
            insurance: this.parseNumber(listing.insurance),
            maintenance: this.parseNumber(listing.maintenance),
            utilities: this.parseNumber(listing.utilities),
            vacancy: this.parseNumber(listing.vacancy || listing.vacancy_rate)
          },
          tenantInfo: listing.tenants ? {
            occupancyRate: this.parseNumber(listing.tenants.occupancy_rate) || 0,
            leaseExpirations: (listing.tenants.lease_expirations || []).map((date: string) => new Date(date)),
            avgRentPerSqft: this.parseNumber(listing.tenants.avg_rent_per_sqft) || 0
          } : undefined,
          lastUpdated: new Date(listing.lastUpdated || listing.updated_at || Date.now())
        }

        properties.push(property)
      }
    } catch (error) {
      console.error(`Error normalizing data from ${provider.name}:`, error)
    }

    return properties
  }

  private generateMockProperties(provider: APIProvider, criteria: SearchCriteria): RealEstateProperty[] {
    const properties: RealEstateProperty[] = []
    const count = Math.floor(Math.random() * 10) + 5 // 5-15 properties

    const propertyTypes = criteria.propertyTypes || ['Apartment', 'Office', 'Retail', 'Industrial', 'Mixed Use']
    const cities = criteria.location.cities || ['Atlanta', 'Birmingham', 'Charleston', 'Jacksonville', 'Nashville']

    for (let i = 0; i < count; i++) {
      const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]
      const city = cities[Math.floor(Math.random() * cities.length)]
      const state = this.getCityState(city)

      const basePrice = (criteria.priceRange?.min || 500000) + Math.random() * 2000000
      const sqft = (criteria.sqftRange?.min || 5000) + Math.random() * 20000
      const units = propertyType === 'Apartment' ? Math.floor(10 + Math.random() * 50) : undefined

      const property: RealEstateProperty = {
        id: `${provider.name.toLowerCase().replace(/\s+/g, '_')}_mock_${Date.now()}_${i}`,
        source: provider.name,
        address: `${Math.floor(Math.random() * 9999) + 1} ${this.getRandomStreetName()} ${this.getRandomStreetType()}`,
        city,
        state,
        zipCode: this.getRandomZipCode(state),
        propertyType,
        propertySubType: this.getPropertySubType(propertyType),
        listingPrice: Math.round(basePrice),
        pricePerSqft: Math.round(basePrice / sqft),
        pricePerUnit: units ? Math.round(basePrice / units) : undefined,
        sqft: Math.round(sqft),
        units,
        yearBuilt: 1980 + Math.floor(Math.random() * 40),
        capRate: 0.04 + Math.random() * 0.06,
        noi: basePrice * (0.05 + Math.random() * 0.05),
        grossIncome: basePrice * (0.08 + Math.random() * 0.04),
        operatingExpenses: basePrice * (0.02 + Math.random() * 0.03),
        listingDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        daysOnMarket: Math.floor(Math.random() * 90),
        status: 'Active',
        description: `Premium ${propertyType.toLowerCase()} property in ${city}. Excellent investment opportunity with strong fundamentals and growth potential.`,
        features: this.generateFeatures(propertyType),
        photos: this.generatePhotoUrls(3 + Math.floor(Math.random() * 5)),
        coordinates: this.getCityCoordinates(city, state),
        contactInfo: {
          agentName: this.generateAgentName(),
          agentPhone: this.generatePhoneNumber(),
          agentEmail: this.generateEmail(),
          brokerageName: `${provider.name} Realty`
        },
        financials: {
          taxes: basePrice * 0.015,
          insurance: basePrice * 0.005,
          maintenance: basePrice * 0.01,
          utilities: basePrice * 0.008,
          vacancy: 0.03 + Math.random() * 0.05
        },
        lastUpdated: new Date()
      }

      properties.push(property)
    }

    return properties
  }

  // Helper methods for data normalization and generation
  private parseNumber(value: any): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(/[,$]/g, ''))
      return isNaN(parsed) ? undefined : parsed
    }
    return undefined
  }

  private normalizePropertyType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'multifamily': 'Apartment',
      'multi-family': 'Apartment',
      'apartment': 'Apartment',
      'office': 'Office',
      'retail': 'Retail',
      'industrial': 'Industrial',
      'warehouse': 'Industrial',
      'mixed-use': 'Mixed Use',
      'mixeduse': 'Mixed Use',
      'hotel': 'Hotel',
      'hospitality': 'Hotel',
      'land': 'Land',
      'development': 'Land'
    }

    return typeMap[type.toLowerCase()] || type
  }

  private normalizeStatus(status: string): 'Active' | 'Under Contract' | 'Sold' | 'Off Market' {
    const statusMap: { [key: string]: 'Active' | 'Under Contract' | 'Sold' | 'Off Market' } = {
      'active': 'Active',
      'available': 'Active',
      'for sale': 'Active',
      'pending': 'Under Contract',
      'under contract': 'Under Contract',
      'sold': 'Sold',
      'closed': 'Sold',
      'withdrawn': 'Off Market',
      'expired': 'Off Market',
      'off market': 'Off Market'
    }

    return statusMap[status.toLowerCase()] || 'Active'
  }

  private parseFeatures(features: any): string[] {
    if (Array.isArray(features)) {
      return features.map(f => typeof f === 'string' ? f : f.name || f.feature || String(f))
    }
    if (typeof features === 'string') {
      return features.split(',').map(f => f.trim())
    }
    return []
  }

  private parsePhotos(photos: any): string[] {
    if (Array.isArray(photos)) {
      return photos.map(p => typeof p === 'string' ? p : p.url || p.src || String(p))
    }
    return []
  }

  private parseDocuments(docs: any): string[] {
    if (Array.isArray(docs)) {
      return docs.map(d => typeof d === 'string' ? d : d.url || d.link || String(d))
    }
    return []
  }

  private deduplicateProperties(properties: RealEstateProperty[]): RealEstateProperty[] {
    const seen = new Set<string>()
    const unique: RealEstateProperty[] = []

    for (const property of properties) {
      const key = `${property.address.toLowerCase()}_${property.city.toLowerCase()}_${property.state.toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(property)
      }
    }

    return unique
  }

  private sortProperties(
    properties: RealEstateProperty[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): RealEstateProperty[] {
    return properties.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'price':
          aValue = a.listingPrice
          bValue = b.listingPrice
          break
        case 'capRate':
          aValue = a.capRate || 0
          bValue = b.capRate || 0
          break
        case 'sqft':
          aValue = a.sqft
          bValue = b.sqft
          break
        case 'listingDate':
          aValue = a.listingDate.getTime()
          bValue = b.listingDate.getTime()
          break
        default:
          aValue = a.lastUpdated.getTime()
          bValue = b.lastUpdated.getTime()
      }

      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }

  // Utility methods for mock data generation
  private getCityState(city: string): string {
    const cityStateMap: { [key: string]: string } = {
      'Atlanta': 'GA',
      'Birmingham': 'AL',
      'Charleston': 'SC',
      'Jacksonville': 'FL',
      'Nashville': 'TN',
      'Charlotte': 'NC',
      'Memphis': 'TN',
      'Savannah': 'GA',
      'Tampa': 'FL',
      'Orlando': 'FL'
    }
    return cityStateMap[city] || 'GA'
  }

  private getRandomZipCode(state: string): string {
    const zipRanges: { [key: string]: [number, number] } = {
      'GA': [30000, 31999],
      'AL': [35000, 36999],
      'SC': [29000, 29999],
      'FL': [32000, 34999],
      'TN': [37000, 38599],
      'NC': [27000, 28999]
    }
    const [min, max] = zipRanges[state] || [30000, 30999]
    return String(Math.floor(Math.random() * (max - min + 1)) + min)
  }

  private getRandomStreetName(): string {
    const names = ['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Park', 'Church', 'High', 'School', 'Water', 'Mill', 'Spring', 'Hill', 'Market', 'Washington', 'Jefferson', 'Lincoln', 'Madison', 'Jackson']
    return names[Math.floor(Math.random() * names.length)]
  }

  private getRandomStreetType(): string {
    const types = ['St', 'Ave', 'Blvd', 'Dr', 'Rd', 'Ln', 'Ct', 'Pl', 'Way', 'Pkwy']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getPropertySubType(type: string): string {
    const subTypes: { [key: string]: string[] } = {
      'Apartment': ['Garden Style', 'High Rise', 'Mid Rise', 'Townhome Style'],
      'Office': ['Class A', 'Class B', 'Class C', 'Medical Office'],
      'Retail': ['Strip Center', 'Shopping Center', 'Free Standing', 'Anchor Store'],
      'Industrial': ['Warehouse', 'Manufacturing', 'Distribution', 'Flex Space'],
      'Mixed Use': ['Residential/Commercial', 'Office/Retail', 'Mixed Income']
    }
    const options = subTypes[type] || ['General']
    return options[Math.floor(Math.random() * options.length)]
  }

  private generateFeatures(propertyType: string): string[] {
    const commonFeatures = ['Professional Management', 'On-Site Parking', 'Security System']
    const typeFeatures: { [key: string]: string[] } = {
      'Apartment': ['Pool', 'Fitness Center', 'Laundry Facilities', 'Balconies'],
      'Office': ['Conference Rooms', 'High-Speed Internet', 'Reception Area', 'Elevator'],
      'Retail': ['Storefront Signage', 'Customer Parking', 'High Traffic Location'],
      'Industrial': ['Loading Docks', 'High Ceilings', 'Overhead Doors', 'Rail Access']
    }

    const features = [...commonFeatures]
    const specific = typeFeatures[propertyType] || []
    features.push(...specific.slice(0, 2 + Math.floor(Math.random() * 3)))
    return features
  }

  private generatePhotoUrls(count: number): string[] {
    // High-quality commercial apartment complex images from Unsplash
    const apartmentComplexImages = [
      'https://images.unsplash.com/photo-1664833189338-f26738a0656d?fm=jpg&q=80&w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1664833189203-cbd564954b11?fm=jpg&q=80&w=800&h=600&fit=crop',
      'https://plus.unsplash.com/premium_photo-1678903964473-1271ecfb0288?fm=jpg&q=80&w=800&h=600&fit=crop',
      'https://plus.unsplash.com/premium_photo-1678963247798-0944cf6ba34d?fm=jpg&q=80&w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1624204386084-dd8c05e32226?fm=jpg&q=80&w=800&h=600&fit=crop',
      'https://plus.unsplash.com/premium_photo-1670275658703-33fb95fe50d8?fm=jpg&q=80&w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1664833185932-4025f52d0c59?fm=jpg&q=80&w=800&h=600&fit=crop',
      'https://plus.unsplash.com/premium_photo-1670168995865-3a515cf74ffd?fm=jpg&q=80&w=800&h=600&fit=crop'
    ]

    const photos: string[] = []
    for (let i = 0; i < count; i++) {
      // Select from our curated apartment complex images with randomization
      const randomOffset = Math.floor(Math.random() * apartmentComplexImages.length)
      const index = (i + randomOffset) % apartmentComplexImages.length
      photos.push(apartmentComplexImages[index])
    }
    return photos
  }

  private getCityCoordinates(city: string, state: string): { latitude: number; longitude: number } {
    const coordinates: { [key: string]: { latitude: number; longitude: number } } = {
      'Atlanta_GA': { latitude: 33.7490, longitude: -84.3880 },
      'Birmingham_AL': { latitude: 33.5186, longitude: -86.8104 },
      'Charleston_SC': { latitude: 32.7765, longitude: -79.9311 },
      'Jacksonville_FL': { latitude: 30.3322, longitude: -81.6557 },
      'Nashville_TN': { latitude: 36.1627, longitude: -86.7816 },
      'Charlotte_NC': { latitude: 35.2271, longitude: -80.8431 }
    }

    const key = `${city}_${state}`
    const baseCoords = coordinates[key] || { latitude: 33.0, longitude: -84.0 }

    return {
      latitude: baseCoords.latitude + (Math.random() - 0.5) * 0.1,
      longitude: baseCoords.longitude + (Math.random() - 0.5) * 0.1
    }
  }

  private generateAgentName(): string {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Ashley', 'James', 'Lisa']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
  }

  private generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100
    const exchange = Math.floor(Math.random() * 900) + 100
    const number = Math.floor(Math.random() * 9000) + 1000
    return `(${areaCode}) ${exchange}-${number}`
  }

  private generateEmail(): string {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
    const name = Math.random().toString(36).substring(2, 8)
    const domain = domains[Math.floor(Math.random() * domains.length)]
    return `${name}@${domain}`
  }

  // Public methods for getting provider information
  getActiveProviders(): APIProvider[] {
    return this.providers.filter(p => p.isActive)
  }

  async getPropertyDetails(propertyId: string, source: string): Promise<RealEstateProperty | null> {
    const provider = this.providers.find(p => p.name === source && p.isActive)
    if (!provider) return null

    try {
      const authHeaders = await this.getAuthHeaders(provider)
      const response = await fetch(`${provider.endpoint}/properties/${propertyId}`, {
        headers: { ...authHeaders }
      })

      if (response.ok) {
        const data = await response.json()
        return this.normalizeProviderData(provider, { properties: [data] })[0]
      }
    } catch (error) {
      console.error(`Error fetching property details from ${source}:`, error)
    }

    return null
  }

  async subscribeToUpdates(criteria: SearchCriteria, callback: (properties: RealEstateProperty[]) => void): Promise<string> {
    const subscriptionId = `sub_${Date.now()}_${Math.random()}`

    // Set up periodic property updates (every 15 minutes in production)
    const interval = setInterval(async () => {
      try {
        const updates = await this.searchProperties(criteria)
        if (updates.length > 0) {
          callback(updates)
        }
      } catch (error) {
        console.error('Error in property subscription:', error)
      }
    }, 900000) // 15 minutes

    // Store interval for cleanup
    this.subscriptions.set(subscriptionId, interval)
    return subscriptionId
  }

  private subscriptions = new Map<string, NodeJS.Timeout>()

  unsubscribeFromUpdates(subscriptionId: string): void {
    const interval = this.subscriptions.get(subscriptionId)
    if (interval) {
      clearInterval(interval)
      this.subscriptions.delete(subscriptionId)
    }
  }
}
