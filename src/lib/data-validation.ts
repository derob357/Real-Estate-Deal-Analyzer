import { z } from 'zod'

/**
 * Data validation schemas and quality check utilities
 */

// Property validation schema
export const PropertyValidationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 characters'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
  propertyType: z.enum(['apartment', 'mixed-use', 'retail', 'office', 'industrial', 'land']),
  units: z.number().min(1).optional(),
  sqft: z.number().min(1, 'Square footage must be positive'),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear()).optional(),
  listingPrice: z.number().min(1, 'Listing price must be positive'),
  capRate: z.number().min(0).max(1).optional(),
  noi: z.number().optional(),
  grossIncome: z.number().optional()
})

// Tax assessment validation schema
export const TaxAssessmentSchema = z.object({
  assessedValue: z.number().min(0),
  taxYear: z.number().min(1900).max(new Date().getFullYear()),
  landValue: z.number().min(0),
  improvementValue: z.number().min(0),
  totalTaxes: z.number().min(0)
})

// Address validation schema
export const AddressSchema = z.object({
  streetNumber: z.string().optional(),
  streetName: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  county: z.string().optional()
})

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  score: number // 0-100 quality score
}

export interface QualityMetrics {
  completeness: number
  accuracy: number
  consistency: number
  freshness: number
  overall: number
}

/**
 * Validate property data
 */
export function validateProperty(data: any): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    score: 100
  }

  try {
    PropertyValidationSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.isValid = false
      result.errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      result.score -= result.errors.length * 10
    }
  }

  // Additional quality checks
  if (data.listingPrice && data.sqft) {
    const pricePerSqft = data.listingPrice / data.sqft
    if (pricePerSqft < 50 || pricePerSqft > 1000) {
      result.warnings.push('Price per square foot seems unusual')
      result.score -= 5
    }
  }

  if (data.capRate && (data.capRate < 0.01 || data.capRate > 0.25)) {
    result.warnings.push('Cap rate is outside typical range (1%-25%)')
    result.score -= 5
  }

  if (data.units && data.propertyType === 'apartment' && data.units < 2) {
    result.warnings.push('Apartment property should have multiple units')
    result.score -= 5
  }

  return result
}

/**
 * Validate address data
 */
export function validateAddress(data: any): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    score: 100
  }

  try {
    AddressSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.isValid = false
      result.errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      result.score -= result.errors.length * 15
    }
  }

  // Check for common address issues
  if (data.streetName && /^\d+$/.test(data.streetName)) {
    result.warnings.push('Street name appears to be only numbers')
    result.score -= 5
  }

  if (data.zipCode && data.zipCode.length === 5) {
    // Could be enhanced with ZIP code database lookup
    const zipPrefix = data.zipCode.substring(0, 3)
    const stateZipMap: { [key: string]: string[] } = {
      'GA': ['300', '301', '302', '303', '304', '305', '306', '307', '308', '309', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319'],
      'FL': ['320', '321', '322', '323', '324', '325', '326', '327', '328', '329', '330', '331', '332', '333', '334', '335', '336', '337', '338', '339', '340', '341', '342', '343', '344', '345'],
      'AL': ['350', '351', '352', '353', '354', '355', '356', '357', '358', '359', '360', '361', '362', '363', '364', '365', '366', '367', '368', '369']
    }

    if (data.state && stateZipMap[data.state] && !stateZipMap[data.state].includes(zipPrefix)) {
      result.warnings.push('ZIP code may not match state')
      result.score -= 10
    }
  }

  return result
}

/**
 * Calculate data quality metrics
 */
export function calculateQualityMetrics(data: any[]): QualityMetrics {
  if (data.length === 0) {
    return { completeness: 0, accuracy: 0, consistency: 0, freshness: 0, overall: 0 }
  }

  let completenessSum = 0
  let accuracySum = 0
  let consistencySum = 0
  let freshnessSum = 0

  for (const item of data) {
    // Completeness: percentage of non-null required fields
    const requiredFields = ['address', 'city', 'state', 'zipCode', 'propertyType']
    const completedFields = requiredFields.filter(field => item[field] && item[field] !== '')
    completenessSum += (completedFields.length / requiredFields.length) * 100

    // Accuracy: based on validation results
    const validation = validateProperty(item)
    accuracySum += validation.score

    // Consistency: check for data consistency
    let consistencyScore = 100
    if (item.listingPrice && item.noi && item.capRate) {
      const calculatedCapRate = item.noi / item.listingPrice
      if (Math.abs(calculatedCapRate - item.capRate) > 0.01) {
        consistencyScore -= 20
      }
    }
    consistencySum += consistencyScore

    // Freshness: based on last update time
    let freshnessScore = 100
    if (item.updatedAt) {
      const daysSinceUpdate = (Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceUpdate > 30) freshnessScore -= 20
      if (daysSinceUpdate > 90) freshnessScore -= 30
      if (daysSinceUpdate > 180) freshnessScore -= 30
    }
    freshnessSum += Math.max(0, freshnessScore)
  }

  const completeness = completenessSum / data.length
  const accuracy = accuracySum / data.length
  const consistency = consistencySum / data.length
  const freshness = freshnessSum / data.length
  const overall = (completeness + accuracy + consistency + freshness) / 4

  return {
    completeness: Math.round(completeness * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
    consistency: Math.round(consistency * 100) / 100,
    freshness: Math.round(freshness * 100) / 100,
    overall: Math.round(overall * 100) / 100
  }
}

/**
 * Normalize property data
 */
export function normalizePropertyData(data: any): any {
  const normalized = { ...data }

  // Normalize state to uppercase
  if (normalized.state) {
    normalized.state = normalized.state.toUpperCase()
  }

  // Normalize ZIP code format
  if (normalized.zipCode) {
    normalized.zipCode = normalized.zipCode.replace(/\D/g, '').substring(0, 5)
  }

  // Normalize property type
  if (normalized.propertyType) {
    normalized.propertyType = normalized.propertyType.toLowerCase().replace(/\s+/g, '-')
  }

  // Normalize address
  if (normalized.address) {
    normalized.address = normalized.address.trim()
      .replace(/\s+/g, ' ')
      .replace(/\b(st|street)\b/gi, 'Street')
      .replace(/\b(ave|avenue)\b/gi, 'Avenue')
      .replace(/\b(rd|road)\b/gi, 'Road')
      .replace(/\b(blvd|boulevard)\b/gi, 'Boulevard')
      .replace(/\b(dr|drive)\b/gi, 'Drive')
  }

  // Normalize city name
  if (normalized.city) {
    normalized.city = normalized.city.trim()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return normalized
}

/**
 * Deduplicate properties based on address similarity
 */
export function findDuplicateProperties(properties: any[]): any[][] {
  const duplicates: any[][] = []
  const processed = new Set()

  for (let i = 0; i < properties.length; i++) {
    if (processed.has(i)) continue

    const current = properties[i]
    const matches = [current]

    for (let j = i + 1; j < properties.length; j++) {
      if (processed.has(j)) continue

      const other = properties[j]

      // Check for exact address match
      if (current.address === other.address &&
          current.city === other.city &&
          current.state === other.state) {
        matches.push(other)
        processed.add(j)
      }

      // Check for similar address (fuzzy matching)
      else if (calculateAddressSimilarity(current, other) > 0.9) {
        matches.push(other)
        processed.add(j)
      }
    }

    if (matches.length > 1) {
      duplicates.push(matches)
    }
    processed.add(i)
  }

  return duplicates
}

/**
 * Calculate address similarity score
 */
function calculateAddressSimilarity(addr1: any, addr2: any): number {
  if (!addr1.address || !addr2.address) return 0

  // Normalize addresses for comparison
  const normalize = (str: string) => str.toLowerCase().replace(/[^\w]/g, '')

  const norm1 = normalize(addr1.address)
  const norm2 = normalize(addr2.address)

  // Simple similarity calculation
  if (norm1 === norm2 && addr1.city === addr2.city && addr1.state === addr2.state) {
    return 1.0
  }

  // Calculate Levenshtein distance ratio
  const distance = levenshteinDistance(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)
  const similarity = 1 - (distance / maxLength)

  return similarity
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
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
