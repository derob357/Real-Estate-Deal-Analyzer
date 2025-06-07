import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sources = [], // Array of sources: ['cbre', 'colliers', 'jll', 'cushman_wakefield']
      jobTypes = [], // Array of job types: ['properties', 'research', 'transactions', 'market_data']
      searchParams = {},
      priority = 2,
      batchSize = 5 // Number of concurrent jobs
    } = body;

    // Validate inputs
    const validSources = ['cbre', 'colliers', 'jll', 'cushman_wakefield'];
    const validJobTypes = ['properties', 'research', 'transactions', 'market_data'];

    const filteredSources = sources.filter((source: string) => validSources.includes(source));
    const filteredJobTypes = jobTypes.filter((type: string) => validJobTypes.includes(type));

    if (filteredSources.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid source is required' },
        { status: 400 }
      );
    }

    if (filteredJobTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid job type is required' },
        { status: 400 }
      );
    }

    // Create mock scraping jobs for each source-jobType combination
    const jobs = [];
    for (const source of filteredSources) {
      for (const jobType of filteredJobTypes) {
        const job = {
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source,
          job_type: jobType,
          search_params: JSON.stringify(searchParams),
          priority,
          status: 'pending',
          created_at: new Date()
        };
        jobs.push(job);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${jobs.length} institutional scraping jobs`,
      jobs: jobs.map(job => ({
        id: job.id,
        source: job.source,
        jobType: job.job_type,
        status: job.status,
        priority: job.priority,
        createdAt: job.created_at
      })),
      batchInfo: {
        totalJobs: jobs.length,
        sources: filteredSources,
        jobTypes: filteredJobTypes,
        estimatedDuration: `${Math.ceil(jobs.length / batchSize) * 5} minutes`
      }
    });

  } catch (error) {
    console.error('Error creating institutional scraping jobs:', error);
    return NextResponse.json(
      { error: 'Failed to create scraping jobs' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');

    // Mock data
    const mockJobs = [
      {
        id: 'job_1',
        source: 'cbre',
        job_type: 'properties',
        status: 'completed',
        priority: 2,
        created_at: new Date(),
        completed_at: new Date(),
        results_count: 25,
        data_quality_score: 0.95
      },
      {
        id: 'job_2',
        source: 'jll',
        job_type: 'research',
        status: 'pending',
        priority: 1,
        created_at: new Date(),
        completed_at: null,
        results_count: 0,
        data_quality_score: null
      }
    ];

    const totalCount = mockJobs.length;
    const offset = (page - 1) * limit;
    const paginatedJobs = mockJobs.slice(offset, offset + limit);

    const response = {
      jobs: paginatedJobs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      },
      statistics: {
        byStatus: [
          { status: 'completed', count: 1, percentage: 50 },
          { status: 'pending', count: 1, percentage: 50 }
        ],
        bySource: [
          { source: 'cbre', count: 1, avgProcessingTime: 5000, avgDataQuality: 95 },
          { source: 'jll', count: 1, avgProcessingTime: null, avgDataQuality: null }
        ],
        byJobType: [
          { jobType: 'properties', count: 1, avgResultsCount: 25 },
          { jobType: 'research', count: 1, avgResultsCount: 0 }
        ]
      },
      performance: {
        successRate: 50,
        avgProcessingTimeMs: 5000,
        avgDataQualityScore: 95,
        totalJobsLast30Days: 2,
        completedJobsLast30Days: 1,
        failedJobsLast30Days: 0,
        totalRecordsScraped: 25,
        avgRecordsPerJob: 25
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching institutional scraping jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scraping jobs' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, action } = body;

    if (!jobId || !action) {
      return NextResponse.json(
        { error: 'Job ID and action are required' },
        { status: 400 }
      );
    }

    // Mock job update
    const mockJob = {
      id: jobId,
      source: 'cbre',
      job_type: 'properties',
      status: action === 'cancel' ? 'cancelled' : 'pending',
      priority: 2,
      created_at: new Date()
    };

    return NextResponse.json({
      success: true,
      message: `Job ${action}ed successfully`,
      job: mockJob
    });

  } catch (error) {
    console.error('Error updating institutional scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to update scraping job' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      return NextResponse.json({
        success: true,
        message: 'Job deleted successfully'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Deleted 0 jobs'
    });

  } catch (error) {
    console.error('Error deleting institutional scraping jobs:', error);
    return NextResponse.json(
      { error: 'Failed to delete scraping jobs' },
      { status: 500 }
    );
  }
}
