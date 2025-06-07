import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const source = searchParams.get('source');
    const reportType = searchParams.get('reportType');
    const marketArea = searchParams.get('marketArea');
    const propertyType = searchParams.get('propertyType');
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');

    // Mock data for market research reports
    const mockReports = [
      {
        id: '1',
        source: 'cbre',
        title: 'Q4 2024 Market Outlook - Southeast Multifamily',
        report_type: 'market_outlook',
        market_area: 'Southeast',
        property_type: 'Multifamily',
        summary: 'Strong fundamentals continue to drive multifamily investment in the Southeast region.',
        key_findings: ['Cap rates averaging 5.5%', 'Rent growth slowing to 3.2%', 'Construction pipeline moderating'],
        investment_themes: ['Value-add opportunities', 'Secondary market focus'],
        publication_date: new Date('2024-12-01'),
        author: 'CBRE Research',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '2',
        source: 'jll',
        title: 'Industrial Real Estate Trends 2025',
        report_type: 'forecast',
        market_area: 'National',
        property_type: 'Industrial',
        summary: 'E-commerce demand continues to drive industrial real estate growth.',
        key_findings: ['Supply chain reconfiguration', 'Last-mile delivery focus', 'Rising construction costs'],
        investment_themes: ['Logistics hubs', 'Cold storage facilities'],
        publication_date: new Date('2024-11-15'),
        author: 'JLL Research',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Filter mock data based on query parameters
    let filteredReports = mockReports;

    if (source) {
      filteredReports = filteredReports.filter(r => r.source === source);
    }

    if (reportType) {
      filteredReports = filteredReports.filter(r => r.report_type.includes(reportType));
    }

    if (marketArea) {
      filteredReports = filteredReports.filter(r => r.market_area?.includes(marketArea));
    }

    if (propertyType) {
      filteredReports = filteredReports.filter(r => r.property_type?.includes(propertyType));
    }

    const totalCount = filteredReports.length;
    const startIndex = (page - 1) * limit;
    const paginatedReports = filteredReports.slice(startIndex, startIndex + limit);

    // Mock aggregations
    const sourceDistribution = [
      { source: 'cbre', count: 1, percentage: 50 },
      { source: 'jll', count: 1, percentage: 50 }
    ];

    const reportTypeDistribution = [
      { reportType: 'market_outlook', count: 1, percentage: 50 },
      { reportType: 'forecast', count: 1, percentage: 50 }
    ];

    const monthlyDistribution = [
      { month: '2024-12', count: 1 },
      { month: '2024-11', count: 1 }
    ];

    // Format response
    const response = {
      reports: paginatedReports,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: startIndex + limit < totalCount,
        hasPrev: page > 1
      },
      aggregations: {
        sourceDistribution,
        reportTypeDistribution,
        monthlyDistribution,
        totalReports: totalCount
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching market research reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market research reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      jobType = 'research',
      searchParams = {},
      priority = 2
    } = body;

    if (!source || !['cbre', 'colliers', 'jll', 'cushman_wakefield'].includes(source)) {
      return NextResponse.json(
        { error: 'Valid source is required (cbre, colliers, jll, cushman_wakefield)' },
        { status: 400 }
      );
    }

    // Mock job creation
    const mockJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      job_type: jobType,
      search_params: JSON.stringify(searchParams),
      priority,
      status: 'pending',
      created_at: new Date()
    };

    return NextResponse.json({
      success: true,
      jobId: mockJob.id,
      message: `Research scraping job created for ${source}`
    });

  } catch (error) {
    console.error('Error creating research scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to create research scraping job' },
      { status: 500 }
    );
  }
}
