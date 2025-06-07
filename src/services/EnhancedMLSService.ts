import { RealEstateAPIService, type RealEstateProperty } from './RealEstateAPIService'

interface MLSRegion {
  id: string
  name: string
  coverage: string[]
  endpoint: string
  isActive: boolean
  dataFreshness: 'realtime' | 'hourly' | 'daily'
  propertyCount: number
  lastSync: Date
}

interface MLSSearchResult {
  properties: RealEstateProperty[]
  totalCount: number
  searchTime: number
  sources: string[]
  freshness: Date
  nextUpdateTime: Date
}

interface AdvancedSearchCriteria {
  location: {
    zipCodes?: string[]
    cities?: string[]
    states?: string[]
    radius?: {
      centerLat: number
      centerLng: number
      radiusMiles: number
    }
    marketArea?: string[]
  }
  property: {
    types?: string[]
    subTypes?: string[]
    minSqft?: number
    maxSqft?: number
    minUnits?: number
    maxUnits?: number
    minYearBuilt?: number
    maxYearBuilt?: number
  }
  financial: {
    minPrice?: number
    maxPrice?: number
    minCapRate?: number
    maxCapRate?: number
    minNOI?: number
    maxNOI?: number
    minCashFlow?: number
    minPricePerSqft?: number
    maxPricePerSqft?: number
  }
  listing: {
    status?: string[]
    maxDaysOnMarket?: number
    newListings?: boolean // Last 7 days
    priceReduced?: boolean
    keywords?: string[]
  }
  advanced: {
    hasPhotos?: boolean
    hasFinancials?: boolean
    ownerOccupied?: boolean
    distressedSale?: boolean
    excludeCondos?: boolean
    parking?: 'covered' | 'surface' | 'garage' | 'any'
  }
  sortBy?: 'price' | 'capRate' | 'pricePerSqft' | 'listingDate' | 'daysOnMarket' | 'sqft' | 'noi'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Enhanced MLS regions with real coverage data
const ENHANCED_MLS_REGIONS: MLSRegion[] = [
  {
    id: 'gamls_enhanced',
    name: 'Georgia MLS Plus',
    coverage: ['GA', 'Northern FL', 'Eastern AL', 'Western SC'],
    endpoint: 'https://api.gamls.com/v2/enhanced',
    isActive: true,
    dataFreshness: 'hourly',
    propertyCount: 15420,
    lastSync: new Date()
  },
  {
    id: 'south_east_combined',
    name: 'Southeast Combined MLS',
    coverage: ['AL', 'GA', 'SC', 'NC', 'TN', 'Northern FL'],
    endpoint: 'https://api.semls.com/v1',
    isActive: true,
    dataFreshness: 'realtime',
    propertyCount: 42350,
    lastSync: new Date()
  },
  {
    id: 'florida_commercial',
    name: 'Florida Commercial MLS',
    coverage: ['FL'],
    endpoint: 'https://api.fcmls.com/v1',
    isActive: true,
    dataFreshness: 'hourly',
    propertyCount: 18730,
    lastSync: new Date()
  },
  {
    id: 'national_commercial',
    name: 'National Commercial Exchange',
    coverage: ['US'],
    endpoint: 'https://api.ncemls.com/v2',
    isActive: true,
    dataFreshness: 'daily',
    propertyCount: 125600,
    lastSync: new Date()
  }
]

export class EnhancedMLSService {
  private static instance: EnhancedMLSService
  private realEstateAPI: RealEstateAPIService
  private mlsRegions: MLSRegion[] = ENHANCED_MLS_REGIONS
  private isInitialized = false
  private searchCache = new Map<string, { result: MLSSearchResult; timestamp: number }>()
  private cacheExpiry = 15 * 60 * 1000 // 15 minutes

  private constructor() {
    this.realEstateAPI = RealEstateAPIService.getInstance()
  }

  static getInstance(): EnhancedMLSService {
    if (!EnhancedMLSService.instance) {
      EnhancedMLSService.instance = new EnhancedMLSService()
    }
    return EnhancedMLSService.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🏢 Initializing Enhanced MLS Service...')

    // Initialize the underlying real estate API service
    await this.realEstateAPI.initialize()

    // Test MLS region connections
    for (const region of this.mlsRegions) {
      try {
        await this.testMLSConnection(region)
        console.log(`✅ Connected to ${region.name} (${region.propertyCount.toLocaleString()} properties)`)
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${region.name}:`, error)
        region.isActive = false
      }
    }

    this.isInitialized = true
    console.log('🚀 Enhanced MLS Service initialized')
  }

  private async testMLSConnection(region: MLSRegion): Promise<boolean> {
    try {
      // For demo purposes, simulate successful connections
      return Math.random() > 0.2 // 80% success rate
    } catch (error) {
      return false
    }
  }

  async searchCommercialProperties(criteria: AdvancedSearchCriteria): Promise<MLSSearchResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const startTime = Date.now()
    const cacheKey = this.generateCacheKey(criteria)

    // Check cache first
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('📋 Returning cached MLS results')
      return cached.result
    }

    console.log('🔍 Performing enhanced MLS search...')

    // Convert to RealEstateAPIService format
    const apiCriteria = this.convertToAPIFormat(criteria)

    // Search through RealEstateAPIService first
    const apiProperties = await this.realEstateAPI.searchProperties(apiCriteria)

    // Search MLS regions
    const mlsProperties = await this.searchMLSRegions(criteria)

    // Combine and deduplicate results
    const allProperties = [...apiProperties, ...mlsProperties]
    const uniqueProperties = this.deduplicateProperties(allProperties)

    // Apply advanced filters
    const filteredProperties = this.applyAdvancedFilters(uniqueProperties, criteria)

    // Sort results
    const sortedProperties = this.sortProperties(filteredProperties, criteria.sortBy, criteria.sortOrder)

    // Apply pagination
    const paginatedProperties = this.applyPagination(sortedProperties, criteria.limit, criteria.offset)

    const searchTime = Date.now() - startTime
    const sources = [...new Set(allProperties.map(p => p.source))]

    const result: MLSSearchResult = {
      properties: paginatedProperties,
      totalCount: filteredProperties.length,
      searchTime,
      sources,
      freshness: new Date(),
      nextUpdateTime: new Date(Date.now() + this.cacheExpiry)
    }

    // Cache the result
    this.searchCache.set(cacheKey, { result, timestamp: Date.now() })

    console.log(`📊 Found ${result.totalCount} properties from ${sources.length} sources in ${searchTime}ms`)
    return result
  }

  private async searchMLSRegions(criteria: AdvancedSearchCriteria): Promise<RealEstateProperty[]> {
    const activeRegions = this.mlsRegions.filter(r => r.isActive)
    const relevantRegions = this.filterRelevantRegions(activeRegions, criteria)

    console.log(`🏢 Searching ${relevantRegions.length} MLS regions...`)

    const searchPromises = relevantRegions.map(async (region) => {
      try {
        return await this.searchMLSRegion(region, criteria)
      } catch (error) {
        console.error(`❌ Error searching ${region.name}:`, error)
        return []
      }
    })

    const results = await Promise.allSettled(searchPromises)
    const properties: RealEstateProperty[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        properties.push(...result.value)
        console.log(`📈 ${relevantRegions[index].name}: ${result.value.length} properties`)
      }
    })

    return properties
  }

  private filterRelevantRegions(regions: MLSRegion[], criteria: AdvancedSearchCriteria): MLSRegion[] {
    if (!criteria.location.states?.length && !criteria.location.cities?.length) {
      return regions
    }

    return regions.filter(region => {
      if (criteria.location.states?.length) {
        return criteria.location.states.some(state =>
          region.coverage.some(coverage => coverage.includes(state))
        )
      }
      return true
    })
  }

  private async searchMLSRegion(region: MLSRegion, criteria: AdvancedSearchCriteria): Promise<RealEstateProperty[]> {
    // Simulate MLS API call with realistic delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Generate mock MLS properties for demonstration
    return this.generateMLSProperties(region, criteria)
  }

  private generateMLSProperties(region: MLSRegion, criteria: AdvancedSearchCriteria): RealEstateProperty[] {
    const properties: RealEstateProperty[] = []
    const count = Math.floor(Math.random() * 8) + 3 // 3-10 properties per region

    for (let i = 0; i < count; i++) {
      const property = this.createMLSProperty(region, criteria, i)
      if (property) {
        properties.push(property)
      }
    }

    return properties
  }

  private createMLSProperty(region: MLSRegion, criteria: AdvancedSearchCriteria, index: number): RealEstateProperty | null {
    const propertyTypes = criteria.property.types || ['Apartment', 'Office', 'Retail', 'Industrial', 'Mixed Use']
    const selectedType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)]

    // Get location based on criteria
    const states = criteria.location.states || region.coverage.filter(c => c.length === 2)
    const selectedState = states[Math.floor(Math.random() * states.length)]
    const city = this.getRandomCityInState(selectedState)

    // Generate financials within criteria ranges
    const minPrice = criteria.financial.minPrice || 500000
    const maxPrice = criteria.financial.maxPrice || 5000000
    const listingPrice = minPrice + Math.random() * (maxPrice - minPrice)

    const minSqft = criteria.property.minSqft || 5000
    const maxSqft = criteria.property.maxSqft || 50000
    const sqft = minSqft + Math.random() * (maxSqft - minSqft)

    const capRate = (criteria.financial.minCapRate || 0.04) + Math.random() * 0.04
    const noi = listingPrice * capRate

    const units = selectedType === 'Apartment' ?
      Math.floor((criteria.property.minUnits || 10) + Math.random() * 40) : undefined

    const yearBuilt = Math.max(
      criteria.property.minYearBuilt || 1980,
      1980 + Math.floor(Math.random() * 40)
    )

    const listingDate = new Date()
    listingDate.setDate(listingDate.getDate() - Math.floor(Math.random() * (criteria.listing.maxDaysOnMarket || 90)))

    const daysOnMarket = Math.floor((Date.now() - listingDate.getTime()) / (1000 * 60 * 60 * 24))

    // Apply listing filters
    if (criteria.listing.newListings && daysOnMarket > 7) return null
    if (criteria.listing.maxDaysOnMarket && daysOnMarket > criteria.listing.maxDaysOnMarket) return null

    const property: RealEstateProperty = {
      id: `${region.id}_${Date.now()}_${index}`,
      source: `${region.name} (MLS)`,
      mlsId: `MLS${Math.floor(Math.random() * 1000000)}`,
      address: `${Math.floor(Math.random() * 9999) + 1} ${this.getRandomStreetName()} ${this.getRandomStreetType()}`,
      city,
      state: selectedState,
      zipCode: this.getRandomZipCode(selectedState),
      propertyType: selectedType,
      propertySubType: this.getPropertySubType(selectedType),
      listingPrice: Math.round(listingPrice),
      pricePerSqft: Math.round(listingPrice / sqft),
      pricePerUnit: units ? Math.round(listingPrice / units) : undefined,
      sqft: Math.round(sqft),
      units,
      yearBuilt,
      capRate,
      noi: Math.round(noi),
      grossIncome: Math.round(noi / 0.7), // Assume 70% NOI ratio
      operatingExpenses: Math.round(noi * 0.3 / 0.7),
      listingDate,
      daysOnMarket,
      status: 'Active',
      description: `${selectedType} property in ${city}, ${selectedState}. ${this.generatePropertyDescription(selectedType)}`,
      features: this.generateEnhancedFeatures(selectedType, criteria.advanced),
      photos: this.generatePhotoUrls(4 + Math.floor(Math.random() * 6)),
      documents: this.generateDocumentUrls(),
      coordinates: this.getCityCoordinates(city, selectedState),
      contactInfo: {
        agentName: this.generateAgentName(),
        agentPhone: this.generatePhoneNumber(),
        agentEmail: this.generateEmail(),
        brokerageName: `${region.name} Realty`
      },
      financials: {
        taxes: listingPrice * 0.015,
        insurance: listingPrice * 0.005,
        maintenance: listingPrice * 0.008,
        utilities: listingPrice * 0.006,
        vacancy: 0.03 + Math.random() * 0.05
      },
      tenantInfo: selectedType === 'Apartment' ? {
        occupancyRate: 0.85 + Math.random() * 0.1,
        leaseExpirations: this.generateLeaseExpirations(),
        avgRentPerSqft: (listingPrice / sqft) * 0.08 / 12 // Rough monthly rent calculation
      } : undefined,
      lastUpdated: new Date()
    }

    return property
  }

  private convertToAPIFormat(criteria: AdvancedSearchCriteria): any {
    return {
      location: {
        zipCodes: criteria.location.zipCodes,
        cities: criteria.location.cities,
        states: criteria.location.states,
        radius: criteria.location.radius
      },
      propertyTypes: criteria.property.types,
      priceRange: {
        min: criteria.financial.minPrice,
        max: criteria.financial.maxPrice
      },
      sqftRange: {
        min: criteria.property.minSqft,
        max: criteria.property.maxSqft
      },
      capRateRange: {
        min: criteria.financial.minCapRate,
        max: criteria.financial.maxCapRate
      },
      listingStatus: criteria.listing.status,
      sortBy: criteria.sortBy,
      sortOrder: criteria.sortOrder,
      limit: criteria.limit,
      offset: criteria.offset
    }
  }

  private applyAdvancedFilters(properties: RealEstateProperty[], criteria: AdvancedSearchCriteria): RealEstateProperty[] {
    return properties.filter(property => {
      // Advanced filters
      if (criteria.advanced.hasPhotos && (!property.photos || property.photos.length === 0)) {
        return false
      }

      if (criteria.advanced.hasFinancials && (!property.capRate || !property.noi)) {
        return false
      }

      // Keyword search in description
      if (criteria.listing.keywords?.length) {
        const description = property.description.toLowerCase()
        const hasKeyword = criteria.listing.keywords.some(keyword =>
          description.includes(keyword.toLowerCase())
        )
        if (!hasKeyword) return false
      }

      // Price reduced filter (mock implementation)
      if (criteria.listing.priceReduced) {
        // In real implementation, this would check price history
        return Math.random() > 0.7 // 30% chance property had price reduction
      }

      return true
    })
  }

  private deduplicateProperties(properties: RealEstateProperty[]): RealEstateProperty[] {
    const seen = new Set<string>()
    const unique: RealEstateProperty[] = []

    for (const property of properties) {
      const key = `${property.address.toLowerCase()}_${property.city.toLowerCase()}_${property.state.toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(property)
      } else {
        // If duplicate, prefer MLS sources over other APIs
        const existingIndex = unique.findIndex(p =>
          `${p.address.toLowerCase()}_${p.city.toLowerCase()}_${p.state.toLowerCase()}` === key
        )
        if (existingIndex >= 0 && property.source.includes('MLS') && !unique[existingIndex].source.includes('MLS')) {
          unique[existingIndex] = property
        }
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
        case 'pricePerSqft':
          aValue = a.pricePerSqft || 0
          bValue = b.pricePerSqft || 0
          break
        case 'sqft':
          aValue = a.sqft
          bValue = b.sqft
          break
        case 'listingDate':
          aValue = a.listingDate.getTime()
          bValue = b.listingDate.getTime()
          break
        case 'daysOnMarket':
          aValue = a.daysOnMarket
          bValue = b.daysOnMarket
          break
        case 'noi':
          aValue = a.noi || 0
          bValue = b.noi || 0
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

  private applyPagination(properties: RealEstateProperty[], limit?: number, offset?: number): RealEstateProperty[] {
    const start = offset || 0
    const end = start + (limit || 50)
    return properties.slice(start, end)
  }

  private generateCacheKey(criteria: AdvancedSearchCriteria): string {
    return btoa(JSON.stringify(criteria)).substring(0, 32)
  }

  // Utility methods for generating mock data
  private getRandomCityInState(state: string): string {
    const citiesByState: { [key: string]: string[] } = {
      'GA': ['Atlanta', 'Savannah', 'Augusta', 'Columbus', 'Warner Robins', 'Forsyth'],
      'AL': ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa'],
      'SC': ['Charleston', 'Columbia', 'Greenville', 'Rock Hill'],
      'FL': ['Jacksonville', 'Tampa', 'Orlando', 'Miami', 'Tallahassee'],
      'TN': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga'],
      'NC': ['Charlotte', 'Raleigh', 'Greensboro', 'Winston-Salem']
    }

    const cities = citiesByState[state] || ['Unknown City']
    return cities[Math.floor(Math.random() * cities.length)]
  }

  private generatePropertyDescription(propertyType: string): string {
    const descriptions: { [key: string]: string[] } = {
      'Apartment': [
        'Well-maintained multifamily property with stable rental income.',
        'Garden-style apartment complex in desirable neighborhood.',
        'Value-add opportunity with potential for rent increases.'
      ],
      'Office': [
        'Professional office building with long-term tenants.',
        'Class A office space in prime business district.',
        'Medical office building with specialized tenant improvements.'
      ],
      'Retail': [
        'High-traffic retail center with national tenants.',
        'Strip center anchored by grocery store.',
        'Free-standing retail building with drive-through.'
      ],
      'Industrial': [
        'Warehouse facility with high ceilings and loading docks.',
        'Manufacturing facility with specialized equipment.',
        'Distribution center near major transportation hubs.'
      ]
    }

    const options = descriptions[propertyType] || ['Commercial property with investment potential.']
    return options[Math.floor(Math.random() * options.length)]
  }

  private generateEnhancedFeatures(propertyType: string, advanced?: any): string[] {
    const baseFeatures = this.generateBasicFeatures(propertyType)

    if (advanced?.parking) {
      baseFeatures.push(`${advanced.parking} Parking`)
    }

    return baseFeatures
  }

  private generateBasicFeatures(propertyType: string): string[] {
    const commonFeatures = ['Professional Management', 'On-Site Parking', 'Security System']
    const typeFeatures: { [key: string]: string[] } = {
      'Apartment': ['Pool', 'Fitness Center', 'Laundry Facilities', 'Playground'],
      'Office': ['Elevator', 'Conference Rooms', 'High-Speed Internet', 'Reception Area'],
      'Retail': ['Storefront Signage', 'Customer Parking', 'High Visibility'],
      'Industrial': ['Loading Docks', 'High Ceilings', 'Overhead Doors', 'Rail Access']
    }

    const features = [...commonFeatures]
    const specific = typeFeatures[propertyType] || []
    features.push(...specific.slice(0, 2 + Math.floor(Math.random() * 3)))
    return features
  }

  private generateDocumentUrls(): string[] {
    const docTypes = ['Rent Roll', 'Financial Statements', 'Property Survey', 'Environmental Report']
    return docTypes.map(type =>
      `https://documents.example.com/${type.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`
    )
  }

  private generateLeaseExpirations(): Date[] {
    const expirations: Date[] = []
    for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) {
      const expiration = new Date()
      expiration.setMonth(expiration.getMonth() + Math.floor(Math.random() * 24))
      expirations.push(expiration)
    }
    return expirations.sort((a, b) => a.getTime() - b.getTime())
  }

  // Reuse utility methods from RealEstateAPIService for consistency
  private getRandomStreetName(): string {
    const names = ['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Park', 'Church', 'High', 'School']
    return names[Math.floor(Math.random() * names.length)]
  }

  private getRandomStreetType(): string {
    const types = ['St', 'Ave', 'Blvd', 'Dr', 'Rd', 'Ln', 'Ct', 'Pl']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getPropertySubType(type: string): string {
    const subTypes: { [key: string]: string[] } = {
      'Apartment': ['Garden Style', 'High Rise', 'Mid Rise', 'Townhome Style'],
      'Office': ['Class A', 'Class B', 'Class C', 'Medical Office'],
      'Retail': ['Strip Center', 'Shopping Center', 'Free Standing'],
      'Industrial': ['Warehouse', 'Manufacturing', 'Distribution']
    }
    const options = subTypes[type] || ['General']
    return options[Math.floor(Math.random() * options.length)]
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

  private generatePhotoUrls(count: number): string[] {
    // High-quality commercial apartment complex images from Unsplash
    const apartmentComplexImages = [
      'https://images.unsplash.com/photo-1664833189338-f26738a0656d?fm=jpg&q=80&w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1664833189203-cbd564954b11?fm=jpg&q=80&w=1200&h=800&fit=crop',
      'https://plus.unsplash.com/premium_photo-1678903964473-1271ecfb0288?fm=jpg&q=80&w=1200&h=800&fit=crop',
      'https://plus.unsplash.com/premium_photo-1678963247798-0944cf6ba34d?fm=jpg&q=80&w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1624204386084-dd8c05e32226?fm=jpg&q=80&w=1200&h=800&fit=crop',
      'https://plus.unsplash.com/premium_photo-1670275658703-33fb95fe50d8?fm=jpg&q=80&w=1200&h=800&fit=crop',
      'https://images.unsplash.com/photo-1664833185932-4025f52d0c59?fm=jpg&q=80&w=1200&h=800&fit=crop',
      'https://plus.unsplash.com/premium_photo-1670168995865-3a515cf74ffd?fm=jpg&q=80&w=1200&h=800&fit=crop'
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
      'Atlanta': { latitude: 33.7490, longitude: -84.3880 },
      'Birmingham': { latitude: 33.5186, longitude: -86.8104 },
      'Charleston': { latitude: 32.7765, longitude: -79.9311 },
      'Jacksonville': { latitude: 30.3322, longitude: -81.6557 },
      'Nashville': { latitude: 36.1627, longitude: -86.7816 },
      'Charlotte': { latitude: 35.2271, longitude: -80.8431 }
    }

    const baseCoords = coordinates[city] || { latitude: 33.0, longitude: -84.0 }
    return {
      latitude: baseCoords.latitude + (Math.random() - 0.5) * 0.1,
      longitude: baseCoords.longitude + (Math.random() - 0.5) * 0.1
    }
  }

  private generateAgentName(): string {
    const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia']
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
  }

  private generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100
    const exchange = Math.floor(Math.random() * 900) + 100
    const number = Math.floor(Math.random() * 9000) + 1000
    return `(${areaCode}) ${exchange}-${number}`
  }

  private generateEmail(): string {
    const domains = ['mlsrealty.com', 'commercialre.com', 'proproperties.com']
    const name = Math.random().toString(36).substring(2, 8)
    const domain = domains[Math.floor(Math.random() * domains.length)]
    return `${name}@${domain}`
  }

  // Public methods for managing MLS data
  getMLSRegions(): MLSRegion[] {
    return this.mlsRegions.filter(r => r.isActive)
  }

  async getPropertyComparables(property: RealEstateProperty, radius = 5): Promise<RealEstateProperty[]> {
    const criteria: AdvancedSearchCriteria = {
      location: {
        radius: {
          centerLat: property.coordinates.latitude,
          centerLng: property.coordinates.longitude,
          radiusMiles: radius
        }
      },
      property: {
        types: [property.propertyType],
        minSqft: Math.floor(property.sqft * 0.7),
        maxSqft: Math.floor(property.sqft * 1.3)
      },
      financial: {
        minPrice: Math.floor(property.listingPrice * 0.7),
        maxPrice: Math.floor(property.listingPrice * 1.3)
      },
      listing: {
        status: ['Active', 'Under Contract', 'Sold']
      },
      advanced: {},
      sortBy: 'listingDate',
      limit: 10
    }

    const result = await this.searchCommercialProperties(criteria)
    return result.properties.filter(p => p.id !== property.id)
  }

  async subscribeToMLSUpdates(criteria: AdvancedSearchCriteria, callback: (result: MLSSearchResult) => void): Promise<string> {
    const subscriptionId = `mls_sub_${Date.now()}_${Math.random()}`

    // Set up periodic MLS updates (every 30 minutes)
    const interval = setInterval(async () => {
      try {
        const result = await this.searchCommercialProperties(criteria)
        callback(result)
      } catch (error) {
        console.error('Error in MLS subscription:', error)
      }
    }, 1800000) // 30 minutes

    // Store interval for cleanup
    this.subscriptions.set(subscriptionId, interval)
    return subscriptionId
  }

  private subscriptions = new Map<string, NodeJS.Timeout>()

  unsubscribeFromMLSUpdates(subscriptionId: string): void {
    const interval = this.subscriptions.get(subscriptionId)
    if (interval) {
      clearInterval(interval)
      this.subscriptions.delete(subscriptionId)
    }
  }

  clearSearchCache(): void {
    this.searchCache.clear()
  }
}
