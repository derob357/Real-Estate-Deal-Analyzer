import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import type { Property } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      address,
      city,
      state,
      zipCode,
      propertyType,
      propertySubType,
      units,
      sqft,
      lotSize,
      yearBuilt,
      listingPrice,
      askingCapRate,
      noi,
      grossIncome,
      description,
      features,
      images = []
    } = body

    // Validate required fields
    if (!address || !city || !state || !zipCode || !propertyType || !sqft || !listingPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create property in database
    const property = await prisma.property.create({
      data: {
        address,
        city,
        state,
        zip_code: zipCode,
        property_type: propertyType,
        property_sub_type: propertySubType,
        units: units || null,
        sqft,
        lot_size: lotSize || null,
        year_built: yearBuilt || null,
        listing_price: listingPrice,
        asking_cap_rate: askingCapRate || null,
        noi: noi || null,
        gross_income: grossIncome || null,
        description: description || null,
        features: features ? JSON.stringify(features) : null,
        images: images ? JSON.stringify(images) : null,
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      property: {
        id: property.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zip_code,
        propertyType: property.property_type,
        propertySubType: property.property_sub_type,
        units: property.units,
        sqft: property.sqft,
        lotSize: property.lot_size,
        yearBuilt: property.year_built,
        listingPrice: property.listing_price,
        askingCapRate: property.asking_cap_rate,
        noi: property.noi,
        grossIncome: property.gross_income,
        description: property.description,
        features: property.features ? JSON.parse(property.features) : [],
        images: property.images ? JSON.parse(property.images) : [],
        createdAt: property.created_at,
        updatedAt: property.updated_at
      }
    })

  } catch (error) {
    console.error('Error creating property:', error)

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A property with this address already exists' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const propertyType = searchParams.get('type')
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const zipCode = searchParams.get('zipCode')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (propertyType) where.property_type = propertyType
    if (city) where.city = { contains: city, mode: 'insensitive' }
    if (state) where.state = state.toUpperCase()
    if (zipCode) where.zip_code = zipCode

    // Get properties with count
    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.property.count({ where })
    ])

    // Transform properties for response
    const transformedProperties = properties.map((property: Property) => ({
      id: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zip_code,
      propertyType: property.property_type,
      propertySubType: property.property_sub_type,
      units: property.units,
      sqft: property.sqft,
      lotSize: property.lot_size,
      yearBuilt: property.year_built,
      listingPrice: property.listing_price,
      askingCapRate: property.asking_cap_rate,
      noi: property.noi,
      grossIncome: property.gross_income,
      description: property.description,
      features: property.features ? JSON.parse(property.features) : [],
      images: property.images ? JSON.parse(property.images) : [],
      createdAt: property.created_at,
      updatedAt: property.updated_at
    }))

    return NextResponse.json({
      properties: transformedProperties,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}
