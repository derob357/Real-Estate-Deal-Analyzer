import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const zipCode = searchParams.get('zipCode');
    const propertyType = searchParams.get('propertyType');
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const minCapRate = searchParams.get('minCapRate') ? Number(searchParams.get('minCapRate')) : undefined;
    const maxCapRate = searchParams.get('maxCapRate') ? Number(searchParams.get('maxCapRate')) : undefined;
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (zipCode) {
      where.zip_code = zipCode;
    }

    if (propertyType) {
      where.property_type = {
        contains: propertyType
      };
    }

    if (minPrice || maxPrice) {
      where.listing_price = {};
      if (minPrice) where.listing_price.gte = minPrice;
      if (maxPrice) where.listing_price.lte = maxPrice;
    }

    if (minCapRate || maxCapRate) {
      where.asking_cap_rate = {};
      if (minCapRate) where.asking_cap_rate.gte = minCapRate / 100;
      if (maxCapRate) where.asking_cap_rate.lte = maxCapRate / 100;
    }

    // Execute query with pagination
    const [properties, totalCount] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.property.count({ where })
    ]);

    // Get aggregated statistics
    const stats = await prisma.property.aggregate({
      where,
      _avg: {
        listing_price: true,
        asking_cap_rate: true
      },
      _min: {
        listing_price: true,
        asking_cap_rate: true
      },
      _max: {
        listing_price: true,
        asking_cap_rate: true
      },
      _count: {
        _all: true
      }
    });

    // Get property type distribution
    const typeDistribution = await prisma.property.groupBy({
      by: ['property_type'],
      where,
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          property_type: 'desc'
        }
      }
    });

    // Format response
    const response = {
      properties: properties.map(property => ({
        ...property,
        cap_rate: property.asking_cap_rate ? property.asking_cap_rate * 100 : null, // Convert to percentage
        source: property.listing_source || 'Direct'
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      },
      aggregations: {
        stats: {
          count: stats._count._all,
          avgPrice: stats._avg.listing_price,
          avgCapRate: stats._avg.asking_cap_rate ? stats._avg.asking_cap_rate * 100 : null,
          priceRange: {
            min: stats._min.listing_price,
            max: stats._max.listing_price
          },
          capRateRange: {
            min: stats._min.asking_cap_rate ? stats._min.asking_cap_rate * 100 : null,
            max: stats._max.asking_cap_rate ? stats._max.asking_cap_rate * 100 : null
          }
        },
        sourceDistribution: [
          { source: 'Direct', count: totalCount, percentage: 100 }
        ],
        typeDistribution: typeDistribution.map(item => ({
          propertyType: item.property_type,
          count: item._count._all,
          percentage: Math.round((item._count._all / totalCount) * 100)
        }))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      jobType = 'properties',
      searchParams = {},
      priority = 1
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
      message: `Institutional scraping job created for ${source}`
    });

  } catch (error) {
    console.error('Error creating scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to create scraping job' },
      { status: 500 }
    );
  }
}
