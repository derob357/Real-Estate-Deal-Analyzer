import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const zipCode = searchParams.get('zipCode');
    const propertyType = searchParams.get('propertyType');
    const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');

    // Mock transaction data
    const mockTransactions = [
      {
        id: '1',
        source: 'cbre',
        property_address: '100 Main Street',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30309',
        property_type: 'Apartment',
        units: 50,
        sq_ft: 45000,
        year_built: 1985,
        sale_price: 5500000,
        sale_date: new Date('2024-11-01'),
        price_per_unit: 110000,
        price_per_sqft: 122.22,
        cap_rate: 0.055,
        buyer: 'ABC Investment Group',
        seller: 'XYZ Properties',
        broker: 'CBRE',
        days_on_market: 120,
        listing_price: 5750000,
        price_change: -250000,
        financing_type: 'conventional',
        investor_type: 'institutional',
        data_confidence: 0.95,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '2',
        source: 'jll',
        property_address: '200 Peachtree Road',
        city: 'Atlanta',
        state: 'GA',
        zip_code: '30309',
        property_type: 'Office',
        units: null,
        sq_ft: 85000,
        year_built: 2010,
        sale_price: 12500000,
        sale_date: new Date('2024-10-15'),
        price_per_unit: null,
        price_per_sqft: 147.06,
        cap_rate: 0.062,
        buyer: 'DEF Capital',
        seller: 'Corporate Holdings LLC',
        broker: 'JLL',
        days_on_market: 90,
        listing_price: 12500000,
        price_change: 0,
        financing_type: 'cash',
        investor_type: 'private',
        data_confidence: 0.88,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Filter mock data
    let filteredTransactions = mockTransactions;

    if (zipCode) {
      filteredTransactions = filteredTransactions.filter(t => t.zip_code === zipCode);
    }

    if (propertyType) {
      filteredTransactions = filteredTransactions.filter(t => t.property_type.includes(propertyType));
    }

    if (minPrice) {
      filteredTransactions = filteredTransactions.filter(t => t.sale_price >= minPrice);
    }

    if (maxPrice) {
      filteredTransactions = filteredTransactions.filter(t => t.sale_price <= maxPrice);
    }

    const totalCount = filteredTransactions.length;
    const startIndex = (page - 1) * limit;
    const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + limit);

    // Mock aggregations
    const stats = {
      _count: { _all: totalCount },
      _avg: {
        sale_price: filteredTransactions.reduce((sum, t) => sum + t.sale_price, 0) / totalCount,
        cap_rate: filteredTransactions.reduce((sum, t) => sum + t.cap_rate, 0) / totalCount,
        price_per_sqft: filteredTransactions.reduce((sum, t) => sum + t.price_per_sqft, 0) / totalCount,
        days_on_market: filteredTransactions.reduce((sum, t) => sum + t.days_on_market, 0) / totalCount
      },
      _min: {
        sale_price: Math.min(...filteredTransactions.map(t => t.sale_price)),
        cap_rate: Math.min(...filteredTransactions.map(t => t.cap_rate))
      },
      _max: {
        sale_price: Math.max(...filteredTransactions.map(t => t.sale_price)),
        cap_rate: Math.max(...filteredTransactions.map(t => t.cap_rate))
      }
    };

    const response = {
      transactions: paginatedTransactions.map(transaction => ({
        ...transaction,
        cap_rate: transaction.cap_rate * 100, // Convert to percentage
        data_confidence: Math.round(transaction.data_confidence * 100)
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: startIndex + limit < totalCount,
        hasPrev: page > 1
      },
      aggregations: {
        stats: {
          count: stats._count._all,
          avgPrice: Math.round(stats._avg.sale_price),
          avgCapRate: Math.round(stats._avg.cap_rate * 10000) / 100, // Convert to percentage
          avgPricePerSqft: Math.round(stats._avg.price_per_sqft * 100) / 100,
          avgDaysOnMarket: Math.round(stats._avg.days_on_market),
          priceRange: {
            min: stats._min.sale_price,
            max: stats._max.sale_price
          },
          capRateRange: {
            min: Math.round(stats._min.cap_rate * 10000) / 100,
            max: Math.round(stats._max.cap_rate * 10000) / 100
          }
        },
        sourceDistribution: [
          { source: 'cbre', count: 1, percentage: 50 },
          { source: 'jll', count: 1, percentage: 50 }
        ],
        typeDistribution: [
          { propertyType: 'Apartment', count: 1, percentage: 50 },
          { propertyType: 'Office', count: 1, percentage: 50 }
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching institutional transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch institutional transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      jobType = 'transactions',
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
      message: `Transaction scraping job created for ${source}`
    });

  } catch (error) {
    console.error('Error creating transaction scraping job:', error);
    return NextResponse.json(
      { error: 'Failed to create scraping job' },
      { status: 500 }
    );
  }
}
