import { useState, useRef } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import FileUpload from './FileUpload'

// =====================================================
// BACKGROUND REMOVER COMPONENT
// 
// This component handles the background removal tool.
// It uses an API to process the image - you'll need to
// add your API key and uncomment the API code.
//
// RECOMMENDED APIs:
// - remove.bg (https://www.remove.bg/api)
// - Photoroom (https://www.photoroom.com/api)
// - Clipdrop (https://clipdrop.co/apis)
// =====================================================

function BackgroundRemover() {
  // The original uploaded file
  const [originalFile, setOriginalFile] = useState(null)
  // Original image URL for comparison
  const [originalImageUrl, setOriginalImageUrl] = useState(null)
  // The processed image (background removed)
  const [processedImage, setProcessedImage] = useState(null)
  // Loading state while API is processing
  const [isProcessing, setIsProcessing] = useState(false)
  // Error state
  const [error, setError] = useState(null)
  // Before/after comparison slider position (0-100)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const comparisonRef = useRef(null)

  // Called when user uploads a file
  const handleFileSelect = (file) => {
    setOriginalFile(file)
    setOriginalImageUrl(file ? URL.createObjectURL(file) : null)
    setProcessedImage(null)
    setError(null)
    setSliderPosition(50)
  }

  // =====================================================
  // API INTEGRATION
  // Replace this function with actual API call
  // =====================================================
  const removeBackground = async () => {
    if (!originalFile) return

    setIsProcessing(true)
    setError(null)

    try {
      // =====================================================
      // OPTION 1: Using remove.bg API
      // Uncomment this code and add your API key
      // =====================================================
      const formData = new FormData()
      formData.append('image_file', originalFile)
      formData.append('size', 'auto')

      const apiKey = import.meta.env.VITE_REMOVE_BG_API_KEY
      const apiUrl = import.meta.env.VITE_REMOVE_BG_API_URL


      if (!apiKey) {
        throw new Error('API key is not configured. Please check your .env file.')
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: formData,
      })

      if (!response.ok) {
        // Log detailed error for debugging, show generic message to user
        let debugInfo = `Status: ${response.status}`
        try {
          const errorData = await response.json()
          debugInfo = JSON.stringify(errorData)
          console.error('Background removal API error:', debugInfo)
        } catch {
          console.error('Background removal API error:', response.status, response.statusText)
        }

        // User-friendly messages based on status code
        if (response.status === 401 || response.status === 403) {
          throw new Error('API authentication failed. Please check your configuration.')
        } else if (response.status === 402) {
          throw new Error('API quota exceeded. Please try again later.')
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.')
        } else {
          throw new Error('Failed to remove background. Please try again.')
        }
      }

      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      setProcessedImage(imageUrl)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }

  // Download the processed image
  const downloadImage = () => {
    if (!processedImage) return
    
    const link = document.createElement('a')
    link.href = processedImage
    const fileExtension = originalFile.name.split('.').pop()
    link.download = `${originalFile.name.replace(`.${fileExtension}`, '')}-no-bg.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Reset to start over
  const reset = () => {
    setOriginalFile(null)
    setOriginalImageUrl(null)
    setProcessedImage(null)
    setError(null)
    setSliderPosition(50)
  }

  // Comparison slider handlers
  const handleSliderMove = (e) => {
    if (!isDragging || !comparisonRef.current) return
    const rect = comparisonRef.current.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }

  const handleSliderStart = (e) => {
    e.preventDefault()
    setIsDragging(true)
    // Also update position on initial click/touch
    if (comparisonRef.current) {
      const rect = comparisonRef.current.getBoundingClientRect()
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPosition(percentage)
    }
  }

  const handleSliderEnd = () => {
    setIsDragging(false)
  }

  return (
    <div>
      {/* Upload Section */}
      <FileUpload onFileSelect={handleFileSelect} />

      {/* Process Button */}
      {originalFile && !processedImage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={removeBackground}
            disabled={isProcessing}
            className="btn-primary flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Remove Background'
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Result Section with Before/After Comparison */}
      {processedImage && (
        <div className="mt-8 space-y-6">
          {/* Before/After Comparison Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <span>Original</span>
              <span>Background Removed</span>
            </div>
            <div
              ref={comparisonRef}
              className="relative aspect-video rounded-xl overflow-hidden cursor-ew-resize select-none preview-container"
              onMouseDown={handleSliderStart}
              onMouseMove={handleSliderMove}
              onMouseUp={handleSliderEnd}
              onMouseLeave={handleSliderEnd}
              onTouchStart={handleSliderStart}
              onTouchMove={handleSliderMove}
              onTouchEnd={handleSliderEnd}
              style={{ touchAction: 'none' }}
            >
              {/* Processed image (full container) */}
              <img
                src={processedImage}
                alt="Processed"
                className="absolute inset-0 w-full h-full object-contain"
                draggable={false}
              />

              {/* Original image overlay (clipped) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={originalImageUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                />
              </div>

              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-3 bg-zinc-400 rounded-full" />
                    <div className="w-0.5 h-3 bg-zinc-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Drag the slider to compare
            </p>
          </div>

          {/* Sticky Action Buttons */}
          <div className="sticky bottom-20 sm:bottom-4 z-40">
            <div className="flex justify-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-green-100 dark:border-zinc-800 shadow-lg">
              <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Start Over</span>
                <span className="sm:hidden">Reset</span>
              </button>
              <button onClick={downloadImage} className="btn-primary flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download PNG</span>
                <span className="sm:hidden">Download</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default BackgroundRemover
