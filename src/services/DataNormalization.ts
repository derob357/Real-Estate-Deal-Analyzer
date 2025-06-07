interface RawProperty {
  id: string
  source: string
  address: string
  city: string
  state: string
  zipCode?: string
  propertyType: string
  listingPrice: number
  sqft: number
  [key: string]: any
}

interface NormalizedProperty {
  id: string
  source: string
  normalizedAddress: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  listingPrice: number
  sqft: number
  pricePerSqft: number
  confidence: number
  duplicateGroup?: string
}

export class DataNormalizationService {
  private static instance: DataNormalizationService

  static getInstance(): DataNormalizationService {
    if (!DataNormalizationService.instance) {
      DataNormalizationService.instance = new DataNormalizationService()
    }
    return DataNormalizationService.instance
  }

  normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b(street|st)\b/g, 'st')
      .replace(/\b(avenue|ave)\b/g, 'ave')
      .replace(/\b(road|rd)\b/g, 'rd')
      .replace(/\b(boulevard|blvd)\b/g, 'blvd')
      .replace(/\b(drive|dr)\b/g, 'dr')
      .replace(/\b(lane|ln)\b/g, 'ln')
      .replace(/\b(court|ct)\b/g, 'ct')
      .replace(/\b(place|pl)\b/g, 'pl')
      .replace(/\b(parkway|pkwy)\b/g, 'pkwy')
      .replace(/\b(circle|cir)\b/g, 'cir')
      .replace(/[^\w\s]/g, '')
  }

  normalizePropertyType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'multi-family': 'apartment',
      'multifamily': 'apartment',
      'apartment complex': 'apartment',
      'apartments': 'apartment',
      'office building': 'office',
      'office space': 'office',
      'retail space': 'retail',
      'shopping center': 'retail',
      'strip mall': 'retail',
      'warehouse': 'industrial',
      'distribution': 'industrial',
      'manufacturing': 'industrial',
      'flex space': 'industrial',
      'mixed use': 'mixed-use',
      'mixed-use': 'mixed-use'
    }

    const normalized = type.toLowerCase().trim()
    return typeMap[normalized] || normalized
  }

  normalizeState(state: string): string {
    const stateMap: { [key: string]: string } = {
      'georgia': 'GA',
      'florida': 'FL',
      'alabama': 'AL',
      'tennessee': 'TN',
      'north carolina': 'NC',
      'south carolina': 'SC'
    }

    const normalized = state.toLowerCase().trim()
    return stateMap[normalized] || state.toUpperCase()
  }

  normalizeZipCode(zipCode: string): string {
    return zipCode.replace(/\D/g, '').substring(0, 5).padStart(5, '0')
  }

  calculateConfidence(property: RawProperty): number {
    let confidence = 100

    // Address quality
    if (!property.address || property.address.length < 10) confidence -= 20
    if (!property.address.match(/\d+/)) confidence -= 15

    // Location data
    if (!property.zipCode) confidence -= 15
    if (!property.city) confidence -= 10
    if (!property.state) confidence -= 10

    // Financial data
    if (!property.listingPrice || property.listingPrice <= 0) confidence -= 20
    if (!property.sqft || property.sqft <= 0) confidence -= 15

    // Source reliability
    if (property.source === 'LoopNet') confidence += 10
    else if (property.source === 'Crexi') confidence += 5

    return Math.max(0, Math.min(100, confidence))
  }

  normalizeProperty(rawProperty: RawProperty): NormalizedProperty {
    const normalizedAddress = this.normalizeAddress(rawProperty.address)
    const state = this.normalizeState(rawProperty.state)
    const zipCode = rawProperty.zipCode ? this.normalizeZipCode(rawProperty.zipCode) : '00000'
    const propertyType = this.normalizePropertyType(rawProperty.propertyType)
    const pricePerSqft = rawProperty.listingPrice / rawProperty.sqft
    const confidence = this.calculateConfidence(rawProperty)

    return {
      id: rawProperty.id,
      source: rawProperty.source,
      normalizedAddress,
      city: rawProperty.city.trim(),
      state,
      zipCode,
      propertyType,
      listingPrice: rawProperty.listingPrice,
      sqft: rawProperty.sqft,
      pricePerSqft: Math.round(pricePerSqft * 100) / 100,
      confidence
    }
  }

  calculateSimilarity(prop1: NormalizedProperty, prop2: NormalizedProperty): number {
    let similarity = 0

    // Address similarity (40% weight)
    const addressSim = this.stringSimilarity(prop1.normalizedAddress, prop2.normalizedAddress)
    similarity += addressSim * 0.4

    // Location similarity (30% weight)
    if (prop1.city.toLowerCase() === prop2.city.toLowerCase()) similarity += 0.15
    if (prop1.state === prop2.state) similarity += 0.1
    if (prop1.zipCode === prop2.zipCode) similarity += 0.05

    // Property characteristics (30% weight)
    if (prop1.propertyType === prop2.propertyType) similarity += 0.1

    const sqftDiff = Math.abs(prop1.sqft - prop2.sqft) / Math.max(prop1.sqft, prop2.sqft)
    similarity += (1 - sqftDiff) * 0.1

    const priceDiff = Math.abs(prop1.listingPrice - prop2.listingPrice) / Math.max(prop1.listingPrice, prop2.listingPrice)
    similarity += (1 - priceDiff) * 0.1

    return Math.min(1, similarity)
  }

  stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  findDuplicates(properties: NormalizedProperty[], threshold: number = 0.85): NormalizedProperty[][] {
    const duplicateGroups: NormalizedProperty[][] = []
    const processed = new Set<string>()

    for (let i = 0; i < properties.length; i++) {
      if (processed.has(properties[i].id)) continue

      const currentGroup = [properties[i]]
      processed.add(properties[i].id)

      for (let j = i + 1; j < properties.length; j++) {
        if (processed.has(properties[j].id)) continue

        const similarity = this.calculateSimilarity(properties[i], properties[j])
        if (similarity >= threshold) {
          currentGroup.push(properties[j])
          processed.add(properties[j].id)
        }
      }

      if (currentGroup.length > 1) {
        duplicateGroups.push(currentGroup)
      }
    }

    return duplicateGroups
  }

  deduplicateProperties(properties: NormalizedProperty[]): {
    deduplicatedProperties: NormalizedProperty[]
    duplicateGroups: NormalizedProperty[][]
    removedCount: number
  } {
    const duplicateGroups = this.findDuplicates(properties)
    const deduplicatedProperties: NormalizedProperty[] = []
    const allDuplicates: NormalizedProperty[] = []

    // Keep track of which properties are duplicates
    const duplicateIds = new Set<string>()
    for (const group of duplicateGroups) {
      for (const prop of group) {
        duplicateIds.add(prop.id)
      }
    }

    // Add non-duplicates
    for (const property of properties) {
      if (!duplicateIds.has(property.id)) {
        deduplicatedProperties.push(property)
      }
    }

    // For each duplicate group, keep the one with highest confidence
    for (const group of duplicateGroups) {
      const bestProperty = group.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      )

      // Mark the group
      const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      for (const prop of group) {
        prop.duplicateGroup = groupId
        allDuplicates.push(prop)
      }

      bestProperty.duplicateGroup = groupId
      deduplicatedProperties.push(bestProperty)
    }

    return {
      deduplicatedProperties,
      duplicateGroups,
      removedCount: properties.length - deduplicatedProperties.length
    }
  }

  processDataBatch(rawProperties: RawProperty[]): {
    normalizedProperties: NormalizedProperty[]
    deduplicatedProperties: NormalizedProperty[]
    statistics: {
      totalInput: number
      normalizedCount: number
      duplicatesFound: number
      finalCount: number
      averageConfidence: number
    }
  } {
    console.log(`📊 Processing ${rawProperties.length} raw properties...`)

    // Step 1: Normalize all properties
    const normalizedProperties = rawProperties.map(prop => this.normalizeProperty(prop))
    console.log(`✅ Normalized ${normalizedProperties.length} properties`)

    // Step 2: Deduplicate
    const { deduplicatedProperties, duplicateGroups } = this.deduplicateProperties(normalizedProperties)
    console.log(`🔍 Found ${duplicateGroups.length} duplicate groups`)
    console.log(`✅ Final count: ${deduplicatedProperties.length} unique properties`)

    // Step 3: Calculate statistics
    const averageConfidence = deduplicatedProperties.reduce((sum, prop) => sum + prop.confidence, 0) / deduplicatedProperties.length

    return {
      normalizedProperties,
      deduplicatedProperties,
      statistics: {
        totalInput: rawProperties.length,
        normalizedCount: normalizedProperties.length,
        duplicatesFound: duplicateGroups.length,
        finalCount: deduplicatedProperties.length,
        averageConfidence: Math.round(averageConfidence * 100) / 100
      }
    }
  }
}
