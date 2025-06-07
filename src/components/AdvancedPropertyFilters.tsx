"use client"

import React, { useState } from 'react'
import { Filter, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface FilterOptions {
  propertyTypes: string[]
  priceRange: [number, number]
  sqftRange: [number, number]
  capRateRange: [number, number]
  unitsRange: [number, number]
  yearBuiltRange: [number, number]
  daysOnMarket: number
  features: string[]
  sources: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  hasPhotos: boolean
  hasFinancials: boolean
}

interface AdvancedPropertyFiltersProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  onReset: () => void
  propertyCount: number
  isLoading?: boolean
}

const PROPERTY_TYPES = [
  'Apartment',
  'Office',
  'Retail',
  'Industrial',
  'Mixed Use',
  'Hotel',
  'Land'
]

const PROPERTY_FEATURES = [
  'Pool',
  'Fitness Center',
  'Parking',
  'Elevator',
  'Security System',
  'Laundry Facilities',
  'Conference Rooms',
  'High-Speed Internet',
  'Loading Docks',
  'Rail Access'
]

const DATA_SOURCES = [
  'LoopNet',
  'Crexi',
  'RealtyRates',
  'MLS',
  'Direct Listing'
]

const SORT_OPTIONS = [
  { value: 'listingPrice', label: 'Price' },
  { value: 'capRate', label: 'Cap Rate' },
  { value: 'pricePerSqft', label: 'Price per Sq Ft' },
  { value: 'sqft', label: 'Square Footage' },
  { value: 'daysOnMarket', label: 'Days on Market' },
  { value: 'listingDate', label: 'Listing Date' },
  { value: 'noi', label: 'Net Operating Income' }
]

export default function AdvancedPropertyFilters({
  filters,
  onFiltersChange,
  onReset,
  propertyCount,
  isLoading = false
}: AdvancedPropertyFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.propertyTypes.length > 0) count++
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000000) count++
    if (filters.sqftRange[0] > 0 || filters.sqftRange[1] < 200000) count++
    if (filters.capRateRange[0] > 0 || filters.capRateRange[1] < 20) count++
    if (filters.features.length > 0) count++
    if (filters.sources.length > 0) count++
    if (filters.hasPhotos || filters.hasFinancials) count++
    return count
  }

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Property Types */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Property Types</Label>
        <div className="grid grid-cols-2 gap-2">
          {PROPERTY_TYPES.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={filters.propertyTypes.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilter('propertyTypes', [...filters.propertyTypes, type])
                  } else {
                    updateFilter('propertyTypes', filters.propertyTypes.filter(t => t !== type))
                  }
                }}
              />
              <Label htmlFor={type} className="text-sm">{type}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Price Range: {formatCurrency(filters.priceRange[0])} - {formatCurrency(filters.priceRange[1])}
        </Label>
        <Slider
          value={filters.priceRange}
          onValueChange={(value) => updateFilter('priceRange', value)}
          min={0}
          max={10000000}
          step={100000}
          className="w-full"
        />
      </div>

      {/* Square Footage */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Square Footage: {formatNumber(filters.sqftRange[0])} - {formatNumber(filters.sqftRange[1])} sq ft
        </Label>
        <Slider
          value={filters.sqftRange}
          onValueChange={(value) => updateFilter('sqftRange', value)}
          min={0}
          max={200000}
          step={1000}
          className="w-full"
        />
      </div>

      {/* Cap Rate Range */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Cap Rate: {filters.capRateRange[0].toFixed(1)}% - {filters.capRateRange[1].toFixed(1)}%
        </Label>
        <Slider
          value={filters.capRateRange}
          onValueChange={(value) => updateFilter('capRateRange', value)}
          min={0}
          max={20}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Units Range */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Number of Units: {filters.unitsRange[0]} - {filters.unitsRange[1]}
        </Label>
        <Slider
          value={filters.unitsRange}
          onValueChange={(value) => updateFilter('unitsRange', value)}
          min={1}
          max={500}
          step={1}
          className="w-full"
        />
      </div>

      {/* Year Built */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Year Built: {filters.yearBuiltRange[0]} - {filters.yearBuiltRange[1]}
        </Label>
        <Slider
          value={filters.yearBuiltRange}
          onValueChange={(value) => updateFilter('yearBuiltRange', value)}
          min={1900}
          max={new Date().getFullYear()}
          step={1}
          className="w-full"
        />
      </div>

      {/* Days on Market */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Max Days on Market: {filters.daysOnMarket}
        </Label>
        <Slider
          value={[filters.daysOnMarket]}
          onValueChange={(value) => updateFilter('daysOnMarket', value[0])}
          min={1}
          max={365}
          step={1}
          className="w-full"
        />
      </div>

      {/* Features */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Features</Label>
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
          {PROPERTY_FEATURES.map((feature) => (
            <div key={feature} className="flex items-center space-x-2">
              <Checkbox
                id={feature}
                checked={filters.features.includes(feature)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilter('features', [...filters.features, feature])
                  } else {
                    updateFilter('features', filters.features.filter(f => f !== feature))
                  }
                }}
              />
              <Label htmlFor={feature} className="text-sm">{feature}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Data Sources */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Data Sources</Label>
        <div className="grid grid-cols-2 gap-2">
          {DATA_SOURCES.map((source) => (
            <div key={source} className="flex items-center space-x-2">
              <Checkbox
                id={source}
                checked={filters.sources.includes(source)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    updateFilter('sources', [...filters.sources, source])
                  } else {
                    updateFilter('sources', filters.sources.filter(s => s !== source))
                  }
                }}
              />
              <Label htmlFor={source} className="text-sm">{source}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Options */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Additional Requirements</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasPhotos"
              checked={filters.hasPhotos}
              onCheckedChange={(checked) => updateFilter('hasPhotos', checked)}
            />
            <Label htmlFor="hasPhotos" className="text-sm">Has Photos</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasFinancials"
              checked={filters.hasFinancials}
              onCheckedChange={(checked) => updateFilter('hasFinancials', checked)}
            />
            <Label htmlFor="hasFinancials" className="text-sm">Has Financial Data</Label>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Sort By</Label>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Order</Label>
          <Select value={filters.sortOrder} onValueChange={(value: 'asc' | 'desc') => updateFilter('sortOrder', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">High to Low</SelectItem>
              <SelectItem value="asc">Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 pt-4 border-t">
        <Button onClick={onReset} variant="outline" className="flex-1">
          Reset Filters
        </Button>
        <Button onClick={() => setIsOpen(false)} className="flex-1">
          Apply Filters
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Desktop Filters */}
      <div className="hidden lg:block flex-1">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <SlidersHorizontal className="h-5 w-5" />
              <span>Advanced Filters</span>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary">{getActiveFiltersCount()} active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FilterContent />
          </CardContent>
        </Card>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>
                Refine your property search with detailed filters
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results Summary */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Searching...</span>
            </div>
          ) : (
            `${propertyCount} properties found`
          )}
        </div>
      </div>
    </div>
  )
}
