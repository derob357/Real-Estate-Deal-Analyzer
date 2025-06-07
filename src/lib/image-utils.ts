// Centralized image utilities for property listings

// High-quality commercial apartment complex images from Unsplash
export const APARTMENT_COMPLEX_IMAGES = [
  'https://images.unsplash.com/photo-1664833189338-f26738a0656d?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1664833189203-cbd564954b11?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://plus.unsplash.com/premium_photo-1678903964473-1271ecfb0288?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://plus.unsplash.com/premium_photo-1678963247798-0944cf6ba34d?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1624204386084-dd8c05e32226?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://plus.unsplash.com/premium_photo-1670275658703-33fb95fe50d8?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1664833185932-4025f52d0c59?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://plus.unsplash.com/premium_photo-1670168995865-3a515cf74ffd?fm=jpg&q=80&w=800&h=600&fit=crop'
]

// Error fallback images (subset for quick loading)
export const ERROR_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1664833189338-f26738a0656d?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1664833189203-cbd564954b11?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://plus.unsplash.com/premium_photo-1678903964473-1271ecfb0288?fm=jpg&q=80&w=800&h=600&fit=crop',
  'https://plus.unsplash.com/premium_photo-1678963247798-0944cf6ba34d?fm=jpg&q=80&w=800&h=600&fit=crop'
]

/**
 * Get a property image URL with intelligent fallback
 * @param property - Property object with images array
 * @param propertyId - Property ID for consistent fallback selection
 * @param imageIndex - Index of the image to retrieve (default: 0 for primary)
 * @returns Image URL (either from property or fallback)
 */
export function getPropertyImageUrl(
  property: { images?: string[] | null },
  propertyId: string,
  imageIndex: number = 0
): string {
  // Use property images if available
  if (property.images && property.images.length > imageIndex) {
    return property.images[imageIndex]
  }

  // Generate consistent fallback based on property ID
  return getFallbackImageUrl(propertyId)
}

/**
 * Get a consistent fallback image based on property ID
 * @param propertyId - Property ID for hash-based selection
 * @returns Fallback image URL
 */
export function getFallbackImageUrl(propertyId: string): string {
  // Create hash from property ID for consistent selection
  const hash = propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = hash % APARTMENT_COMPLEX_IMAGES.length
  return APARTMENT_COMPLEX_IMAGES[index]
}

/**
 * Get a random error fallback image
 * @returns Random error fallback image URL
 */
export function getRandomErrorFallback(): string {
  const randomIndex = Math.floor(Math.random() * ERROR_FALLBACK_IMAGES.length)
  return ERROR_FALLBACK_IMAGES[randomIndex]
}

/**
 * Handle image error by setting a random fallback
 * @param imgElement - Image HTML element
 */
export function handleImageError(imgElement: HTMLImageElement): void {
  // Prevent infinite error loops
  if (imgElement.dataset.fallbackUsed === 'true') return

  imgElement.dataset.fallbackUsed = 'true'
  imgElement.src = getRandomErrorFallback()
}

/**
 * Get all property images with fallbacks
 * @param property - Property object
 * @param propertyId - Property ID
 * @param maxImages - Maximum number of images to return
 * @returns Array of image URLs
 */
export function getAllPropertyImages(
  property: { images?: string[] | null },
  propertyId: string,
  maxImages: number = 5
): string[] {
  const images: string[] = []

  // Add actual property images
  if (property.images && property.images.length > 0) {
    images.push(...property.images.slice(0, maxImages))
  }

  // Fill remaining slots with fallback images if needed
  while (images.length < maxImages) {
    const fallbackIndex = images.length
    const hash = (propertyId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + fallbackIndex)
    const index = hash % APARTMENT_COMPLEX_IMAGES.length
    images.push(APARTMENT_COMPLEX_IMAGES[index])
  }

  return images
}
