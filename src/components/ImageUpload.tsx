"use client"

import React, { useState, useCallback, useRef } from 'react'
import { Upload, X, ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface ImageUploadProps {
  onImagesChange: (images: string[]) => void
  maxImages?: number
  maxFileSize?: number // in MB
  existingImages?: string[]
  disabled?: boolean
}

interface UploadedImage {
  id: string
  url: string
  file?: File
  isUploading?: boolean
  error?: string
}

export default function ImageUpload({
  onImagesChange,
  maxImages = 10,
  maxFileSize = 5,
  existingImages = [],
  disabled = false
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(
    existingImages.map((url, index) => ({
      id: `existing-${index}`,
      url
    }))
  )
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please upload only image files'
    }

    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`
    }

    // Check supported formats
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!supportedFormats.includes(file.type)) {
      return 'Supported formats: JPEG, PNG, WebP'
    }

    return null
  }, [maxFileSize])

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', 'property')

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Upload failed')
    }

    const result = await response.json()
    return result.url
  }

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return

    const fileArray = Array.from(files)

    // Check if adding these files would exceed the limit
    if (images.length + fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`)
      return
    }

    // Validate files
    const validFiles: File[] = []
    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        toast.error(`${file.name}: ${error}`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    // Create temporary image objects with loading state
    const tempImages: UploadedImage[] = validFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      file,
      isUploading: true
    }))

    setImages(prev => [...prev, ...tempImages])

    // Upload files
    for (const tempImage of tempImages) {
      try {
        const uploadedUrl = await uploadImage(tempImage.file!)

        setImages(prev => prev.map(img =>
          img.id === tempImage.id
            ? { ...img, url: uploadedUrl, isUploading: false, file: undefined }
            : img
        ))
      } catch (error) {
        console.error('Upload error:', error)
        setImages(prev => prev.map(img =>
          img.id === tempImage.id
            ? { ...img, isUploading: false, error: error instanceof Error ? error.message : 'Upload failed' }
            : img
        ))
        toast.error(`Failed to upload ${tempImage.file?.name}`)
      }
    }
  }, [images.length, maxImages, disabled, validateFile])

  // Update parent component when images change
  React.useEffect(() => {
    const uploadedUrls = images
      .filter(img => !img.isUploading && !img.error)
      .map(img => img.url)
    onImagesChange(uploadedUrls)
  }, [images, onImagesChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [handleFiles, disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }, [handleFiles])

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId)
      if (imageToRemove?.url.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.url)
      }
      return prev.filter(img => img.id !== imageId)
    })
  }, [])

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev]
      const [removed] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, removed)
      return newImages
    })
  }, [])

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : disabled
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="text-center">
          <Upload className={`mx-auto h-12 w-12 ${
            disabled ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <div className="mt-4">
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
              Drag and drop images here, or{' '}
              <button
                type="button"
                className={`font-medium ${
                  disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-500'
                }`}
                onClick={() => !disabled && fileInputRef.current?.click()}
                disabled={disabled}
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG, WebP up to {maxFileSize}MB each (max {maxImages} images)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <Card key={image.id} className="relative group">
              <CardContent className="p-2">
                <div className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden">
                  {image.error ? (
                    <div className="w-full h-full flex items-center justify-center bg-red-50">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-xs text-red-600">{image.error}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <img
                        src={image.url}
                        alt={`Property image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {image.isUploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                    </>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* Primary Image Badge */}
                  {index === 0 && !image.error && (
                    <Badge
                      variant="secondary"
                      className="absolute bottom-2 left-2 text-xs"
                    >
                      Primary
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Progress Info */}
      {images.some(img => img.isUploading) && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading images...</span>
        </div>
      )}

      {/* Images Count */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>{images.filter(img => !img.error).length} of {maxImages} images</span>
        {images.length > 0 && (
          <span>Drag to reorder • First image will be the primary photo</span>
        )}
      </div>
    </div>
  )
}
