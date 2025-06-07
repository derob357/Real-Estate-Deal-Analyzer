"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Building2, MapPin, DollarSign, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import PropertyForm from './PropertyForm'
import { getPropertyImageUrl, handleImageError } from '@/lib/image-utils'

interface Property {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  propertyType: string
  propertySubType?: string
  units?: number
  sqft: number
  lotSize?: number
  yearBuilt?: number
  listingPrice: number
  askingCapRate?: number
  noi?: number
  grossIncome?: number
  description?: string
  features?: string[]
  images: string[]
  createdAt: string
  updatedAt: string
}

interface PropertyFilters {
  search: string
  propertyType: string
  city: string
  state: string
}

export default function PropertyManagement() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [filters, setFilters] = useState<PropertyFilters>({
    search: '',
    propertyType: '',
    city: '',
    state: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  })

  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true)
      const searchParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.propertyType) searchParams.append('type', filters.propertyType)
      if (filters.city) searchParams.append('city', filters.city)
      if (filters.state) searchParams.append('state', filters.state)

      const response = await fetch(`/api/properties/create?${searchParams}`)
      if (!response.ok) throw new Error('Failed to fetch properties')

      const data = await response.json()
      setProperties(data.properties)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, filters])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  const handleCreateProperty = async (propertyData: any) => {
    try {
      setIsCreating(true)
      const response = await fetch('/api/properties/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(propertyData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create property')
      }

      const result = await response.json()
      toast.success('Property created successfully!')
      setShowCreateDialog(false)
      fetchProperties() // Refresh the list
    } catch (error) {
      console.error('Error creating property:', error)
      throw error // Re-throw to let PropertyForm handle it
    } finally {
      setIsCreating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(amount)
  }

  const formatPercentage = (rate?: number) => {
    if (!rate) return 'N/A'
    return `${(rate * 100).toFixed(2)}%`
  }

  const getPropertyTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      apartment: 'bg-blue-100 text-blue-800',
      'mixed-use': 'bg-purple-100 text-purple-800',
      retail: 'bg-green-100 text-green-800',
      office: 'bg-orange-100 text-orange-800',
      industrial: 'bg-gray-100 text-gray-800',
      land: 'bg-yellow-100 text-yellow-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const filteredProperties = properties.filter(property => {
    const matchesSearch = !filters.search ||
      property.address.toLowerCase().includes(filters.search.toLowerCase()) ||
      property.city.toLowerCase().includes(filters.search.toLowerCase())

    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
          <p className="text-gray-600 mt-1">Manage your property listings and upload images</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Property</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Property</DialogTitle>
              <DialogDescription>
                Add a new property listing with photos and detailed information
              </DialogDescription>
            </DialogHeader>
            <PropertyForm
              onSubmit={handleCreateProperty}
              isLoading={isCreating}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.propertyType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="mixed-use">Mixed Use</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="City"
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            />

            <Input
              placeholder="State"
              value={filters.state}
              onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
              maxLength={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">
              {properties.length === 0 ? 'No properties yet' : 'No properties match your filters'}
            </p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Property
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Property Image */}
              <div className="aspect-video bg-gray-200 overflow-hidden">
                <img
                  src={getPropertyImageUrl(property, property.id)}
                  alt={property.address}
                  className="w-full h-full object-cover"
                  onError={(e) => handleImageError(e.currentTarget)}
                />
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Property Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {property.address}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {property.city}, {property.state} {property.zipCode}
                    </p>
                  </div>

                  {/* Property Details */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getPropertyTypeColor(property.propertyType)}>
                      {property.propertyType.replace('-', ' ')}
                    </Badge>
                    {property.propertySubType && (
                      <Badge variant="outline" className="text-xs">
                        {property.propertySubType}
                      </Badge>
                    )}
                    {property.images.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {property.images.length} photos
                      </Badge>
                    )}
                  </div>

                  {/* Financial Info */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <p className="text-xs text-gray-500">List Price</p>
                      <p className="font-semibold text-sm">{formatCurrency(property.listingPrice)}</p>
                    </div>
                    {property.askingCapRate && (
                      <div>
                        <p className="text-xs text-gray-500">Cap Rate</p>
                        <p className="font-semibold text-sm">{formatPercentage(property.askingCapRate)}</p>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  <div className="flex justify-between text-xs text-gray-600 pt-1">
                    {property.units && <span>{property.units} units</span>}
                    <span>{property.sqft.toLocaleString()} sq ft</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
