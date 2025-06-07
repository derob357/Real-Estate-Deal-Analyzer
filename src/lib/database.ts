// Database configuration for PostgreSQL (Supabase) with proper error handling

import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient

// Check if we're in build time (no database access needed)
const isBuildTime = (
  process.env.NETLIFY === 'true' ||  // Netlify build environment
  process.env.VERCEL === '1' ||      // Vercel build environment
  process.env.CI === 'true' ||       // CI environment
  process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL
)

if (process.env.NODE_ENV === 'production' && !isBuildTime) {
  // Production runtime: Use PostgreSQL (Supabase)
  try {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql') && !process.env.DATABASE_URL.includes('[YOUR_DATABASE_PASSWORD]')) {
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        },
        log: ['warn', 'error']
      })
    } else {
      console.warn('⚠️ No valid PostgreSQL DATABASE_URL found, using fallback')
      // Use a mock client that won't crash during runtime
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: 'file:./fallback.db'
          }
        },
        log: ['warn', 'error']
      })
    }
  } catch (error) {
    console.error('❌ Database connection failed, using fallback:', error)
    // Fallback to SQLite for graceful degradation
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./fallback.db'
        }
      },
      log: ['warn', 'error']
    })
  }
} else if (isBuildTime) {
  // Build time: Use a minimal client that won't attempt connections
  console.log('🏗️ Build time detected - using minimal database client')
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./build.db'
      }
    },
    log: ['error']
  })
} else {
  // Development: Use existing prisma instance or create new one
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error']
    })
  }
  prisma = global.prisma
}

// Test connection with graceful error handling
async function testConnection() {
  // Skip connection test during build time
  if (isBuildTime) {
    console.log('🏗️ Skipping database connection test during build')
    return false
  }
  
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection test failed:', error)
    return false
  }
}

// Initialize connection test (skip during build)
if (typeof window === 'undefined' && !isBuildTime) {
  testConnection().catch(() => {
    console.log('🔄 Database will retry connection on next request')
  })
}

// Database utilities for connection management
export const DatabaseUtils = {
  async ensureConnection(): Promise<boolean> {
    // Return false during build time to avoid connection attempts
    if (isBuildTime) {
      console.log('🏗️ Build time detected - skipping database connection')
      return false
    }
    
    try {
      await prisma.$connect()
      return true
    } catch (error) {
      console.error('Database connection failed:', error)
      return false
    }
  }
}

export { prisma }
export default prisma
