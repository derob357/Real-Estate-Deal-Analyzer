import { NextRequest, NextResponse } from 'next/server'
import { JobQueueSystem } from '@/services/JobQueueSystem'
import { PropertyIngestionPipeline } from '@/services/PropertyIngestionPipeline'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, zipCodes, platforms, priority = 3, recurring = false, intervalHours = 24 } = body

    if (!type || !zipCodes || !Array.isArray(zipCodes)) {
      return NextResponse.json(
        { error: 'Type and zipCodes array are required' },
        { status: 400 }
      )
    }

    const jobQueue = JobQueueSystem.getInstance()
    const pipeline = PropertyIngestionPipeline.getInstance()
    const jobIds: string[] = []

    switch (type) {
      case 'scraping':
        for (const zipCode of zipCodes) {
          const jobId = jobQueue.scheduleScraping(
            platforms?.[0] || 'LoopNet',
            { zipCode },
            priority
          )
          jobIds.push(jobId)
        }
        break

      case 'ingestion':
        if (recurring) {
          const recurringJobIds = await pipeline.scheduleRecurringIngestion(
            zipCodes,
            intervalHours,
            { sources: platforms || ['LoopNet', 'Crexi'] }
          )
          jobIds.push(...recurringJobIds)
        } else {
          for (const zipCode of zipCodes) {
            const jobId = jobQueue.addJob(
              'data_processing',
              {
                operation: 'ingestion',
                zipCode,
                platforms: platforms || ['LoopNet', 'Crexi']
              },
              priority
            )
            jobIds.push(jobId)
          }
        }
        break

      case 'market_analysis':
        for (const zipCode of zipCodes) {
          const jobId = jobQueue.scheduleMarketAnalysis(zipCode, 'comprehensive', priority)
          jobIds.push(jobId)
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid job type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Scheduled ${jobIds.length} ${type} jobs`,
      jobIds,
      recurring
    })

  } catch (error) {
    console.error('Scheduler API error:', error)
    return NextResponse.json(
      { error: 'Failed to schedule jobs' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const jobQueue = JobQueueSystem.getInstance()
    const stats = jobQueue.getQueueStats()
    const recentJobs = jobQueue.getAllJobs()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20)

    return NextResponse.json({
      success: true,
      queueStats: stats,
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        attempts: job.attempts,
        errorMessage: job.errorMessage
      }))
    })

  } catch (error) {
    console.error('Queue status API error:', error)
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    )
  }
}
