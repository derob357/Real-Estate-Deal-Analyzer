"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Building2, DollarSign, Home, MapPin, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import ImageUpload from './ImageUpload'

const propertySchema = z.object({
  // Basic Information
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),

  // Property Details
  propertyType: z.enum(['apartment', 'mixed-use', 'retail', 'office', 'industrial', 'land']),
  propertySubType: z.string().optional(),
  units: z.number().min(1).optional(),
  sqft: z.number().min(1, 'Square footage is required'),
  lotSize: z.number().optional(),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear()).optional(),

  // Financial Information
  listingPrice: z.number().min(1, 'Listing price is required'),
  askingCapRate: z.number().min(0).max(1).optional(),
  noi: z.number().optional(),
  grossIncome: z.number().optional(),

  // Additional Details
  description: z.string().optional(),
  features: z.array(z.string()).optional()
})

type PropertyFormData = z.infer<typeof propertySchema>

interface PropertyFormProps {
  onSubmit: (data: PropertyFormData & { images: string[] }) => Promise<void>
  initialData?: Partial<PropertyFormData & { images: string[] }>
  isLoading?: boolean
}

const propertyTypes = [
  { value: 'apartment', label: 'Apartment Complex' },
  { value: 'mixed-use', label: 'Mixed Use' },
  { value: 'retail', label: 'Retail' },
  { value: 'office', label: 'Office' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'land', label: 'Land' }
]

const propertySubTypes = {
  apartment: ['Garden Style', 'High Rise', 'Mid Rise', 'Townhome Style'],
  'mixed-use': ['Residential/Commercial', 'Office/Retail', 'Mixed Income'],
  retail: ['Strip Center', 'Shopping Center', 'Free Standing', 'Anchor Store'],
  office: ['Class A', 'Class B', 'Class C', 'Medical Office'],
  industrial: ['Warehouse', 'Manufacturing', 'Distribution', 'Flex Space'],
  land: ['Development', 'Agricultural', 'Residential', 'Commercial']
}

export default function PropertyForm({ onSubmit, initialData, isLoading = false }: PropertyFormProps) {
  const [images, setImages] = useState<string[]>(initialData?.images || [])
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(initialData?.propertyType || 'apartment')

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      propertyType: 'apartment',
      sqft: undefined,
      listingPrice: undefined,
      ...initialData
    }
  })

  const handleSubmit = async (data: PropertyFormData) => {
    try {
      await onSubmit({ ...data, images })
      toast.success('Property saved successfully!')
      form.reset()
      setImages([])
    } catch (error) {
      console.error('Error saving property:', error)
      toast.error('Failed to save property')
    }
  }

  const handlePropertyTypeChange = (value: string) => {
    setSelectedPropertyType(value)
    form.setValue('propertyType', value as any)
    form.setValue('propertySubType', '') // Reset subtype when type changes
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-6 w-6" />
          <span>Add Property Listing</span>
        </CardTitle>
        <CardDescription>
          Create a new property listing with photos and detailed information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Property Details</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Property Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Atlanta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="GA" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="30309" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Property Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select
                          onValueChange={handlePropertyTypeChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {propertyTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertySubType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Subtype</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subtype" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {propertySubTypes[selectedPropertyType as keyof typeof propertySubTypes]?.map((subtype) => (
                              <SelectItem key={subtype} value={subtype}>
                                {subtype}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sqft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Footage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="5000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedPropertyType === 'apartment' && (
                    <FormField
                      control={form.control}
                      name="units"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Units</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="24"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="yearBuilt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year Built</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1995"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lotSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot Size (sq ft)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Optional</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Financial Information Tab */}
              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="listingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Listing Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2500000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="askingCapRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cap Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="5.5"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) / 100)}
                          />
                        </FormControl>
                        <FormDescription>Optional - Enter as percentage (e.g., 5.5 for 5.5%)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="noi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Net Operating Income (NOI)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="150000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Optional - Annual NOI</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="grossIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Income</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="200000"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Optional - Annual gross income</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Property Images</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload high-quality images of your property. The first image will be used as the primary photo.
                  </p>
                  <ImageUpload
                    onImagesChange={setImages}
                    existingImages={images}
                    maxImages={20}
                    maxFileSize={10}
                    disabled={isLoading}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Submit Button */}
            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Property
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
