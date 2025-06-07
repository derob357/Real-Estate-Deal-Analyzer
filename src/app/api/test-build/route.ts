import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'success',
      message: 'API is working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      build_time: Boolean(process.env.NETLIFY || process.env.CI)
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'API test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}