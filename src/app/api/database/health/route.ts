import { NextRequest, NextResponse } from 'next/server'
import {
  validateDatabaseSchema,
  databaseHealthCheck,
  initializeDatabaseData,
  cleanupDatabase
} from '@/lib/database-schema'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'validate': {
        const validation = await validateDatabaseSchema()
        return NextResponse.json({
          success: true,
          validation
        })
      }

      case 'initialize': {
        await initializeDatabaseData()
        return NextResponse.json({
          success: true,
          message: 'Database initialized with sample data'
        })
      }

      case 'cleanup': {
        await cleanupDatabase()
        return NextResponse.json({
          success: true,
          message: 'Database cleanup completed'
        })
      }

      default: {
        // Default health check
        const health = await databaseHealthCheck()
        const validation = await validateDatabaseSchema()

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          database: {
            type: 'PostgreSQL (Supabase)',
            project_id: 'zqpyypormwbmkhnlsqjo',
            region: 'us-east-2',
            url: 'https://zqpyypormwbmkhnlsqjo.supabase.co'
          },
          health,
          schema: validation,
          actions: {
            validate: '/api/database/health?action=validate',
            initialize: '/api/database/health?action=initialize',
            cleanup: '/api/database/health?action=cleanup'
          }
        })
      }
    }

  } catch (error) {
    console.error('Database health check failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'reset': {
        // This would be a dangerous operation - only allow in development
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Reset not allowed in production' },
            { status: 403 }
          )
        }

        await cleanupDatabase()
        await initializeDatabaseData()

        return NextResponse.json({
          success: true,
          message: 'Database reset and reinitialized'
        })
      }

      case 'optimize': {
        // Run cleanup and validation
        await cleanupDatabase()
        const validation = await validateDatabaseSchema()
        const health = await databaseHealthCheck()

        return NextResponse.json({
          success: true,
          message: 'Database optimized',
          health,
          validation
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Database operation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
