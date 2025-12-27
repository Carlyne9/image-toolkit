import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import FileUpload from './FileUpload'
import { ImageTracer } from '@image-tracer-ts/core'
import { removeBackground } from '@imgly/background-removal'

// Format configurations for download
const FORMAT_CONFIGS = {
  png: { mime: 'image/png', extension: 'png', label: 'PNG' },
  jpeg: { mime: 'image/jpeg', extension: 'jpg', label: 'JPEG' },
  webp: { mime: 'image/webp', extension: 'webp', label: 'WebP' },
  svg: { mime: 'image/svg+xml', extension: 'svg', label: 'SVG' },
}

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
  const fileUploadRef = useRef(null)
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
  // Download format selection
  const [downloadFormat, setDownloadFormat] = useState('png')
  const [isConverting, setIsConverting] = useState(false)
  const [showFormatDropdown, setShowFormatDropdown] = useState(false)

  // Called when user uploads a file
  const handleFileSelect = (file) => {
    setOriginalFile(file)
    setOriginalImageUrl(file ? URL.createObjectURL(file) : null)
    setProcessedImage(null)
    setError(null)
    setSliderPosition(50)
  }

  // Get original dimensions and downscale for processing
  const prepareImageForProcessing = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const originalWidth = img.width
          const originalHeight = img.height

          const canvas = document.createElement('canvas')
          // Compress to max 1028px for fast processing
          let width = originalWidth
          let height = originalHeight
          const MAX_SIZE = 1028

          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          canvas.width = width
          canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            resolve({
              file: blob,
              originalWidth,
              originalHeight,
              compressedWidth: width,
              compressedHeight: height,
            })
          }, 'image/png')
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  // Upscale processed image back to original dimensions
  const upscaleImage = (dataUrl, targetWidth, targetHeight) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext('2d')
        // Use high-quality upscaling
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        canvas.toBlob(resolve, 'image/png')
      }
      img.src = dataUrl
    })
  }

  // =====================================================
  // CLIENT-SIDE BACKGROUND REMOVAL
  // Using imgly/background-removal (runs entirely in browser)
  // Compresses before processing, upscales after for speed + quality
  // =====================================================
  const handleBackgroundRemoval = async () => {
    if (!originalFile) return

    setIsProcessing(true)
    setError(null)

    try {
      // Compress image for faster processing
      const { file, originalWidth, originalHeight } = await prepareImageForProcessing(originalFile)
      
      // Process with background removal
      const blob = await removeBackground(file)
      
      // Convert to data URL for upscaling
      const dataUrl = URL.createObjectURL(blob)
      
      // Upscale back to original dimensions for better quality
      const upscaledBlob = await upscaleImage(dataUrl, originalWidth, originalHeight)
      const imageUrl = URL.createObjectURL(upscaledBlob)
      
      setProcessedImage(imageUrl)
      URL.revokeObjectURL(dataUrl)
    } catch (err) {
      setError(err.message || 'Failed to remove background')
      console.error('Background removal error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // Optimize image size for faster processing
  const optimizeImageSize = (img) => {
    const MAX_WIDTH = 1200
    const MAX_HEIGHT = 1200
    let width = img.width
    let height = img.height

    // Scale down if larger than max dimensions
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const widthRatio = MAX_WIDTH / width
      const heightRatio = MAX_HEIGHT / height
      const ratio = Math.min(widthRatio, heightRatio)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    return { width, height }
  }

  // Convert image to SVG using image tracing
  const convertToSVG = async (img) => {
    try {
      // Optimize image size for faster processing
      const { width, height } = optimizeImageSize(img)

      // Draw image to canvas to get ImageData
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)

      // Configure tracer for color mode (simple, default)
      const options = {
        numberOfColors: 16,
        colorSamplingMode: 'scan',
        fillStyle: 'fill',
        strokeWidth: 0,
        lineErrorMargin: 1,
        curveErrorMargin: 1,
        colorClusteringCycles: 3,
        minColorQuota: 0.02,
      }

      const tracer = new ImageTracer(options)
      const svgString = tracer.traceImage(imageData)

      // Convert SVG string to blob
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      return blob
    } catch (err) {
      throw new Error(`SVG conversion error: ${err.message}`)
    }
  }

  // Convert image to selected format
  const convertImage = async () => {
    if (!processedImage) return
    
    setIsConverting(true)
    try {
      // Load the processed image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = processedImage
      })

      // Handle SVG separately
      if (downloadFormat === 'svg') {
        return await convertToSVG(img)
      }

      // Optimize image size for faster processing
      const { width, height } = optimizeImageSize(img)

      // Create canvas with appropriate settings for other formats
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      // For JPEG, fill with white background (no transparency support)
      if (downloadFormat === 'jpeg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
      }

      // Draw the image (scaled)
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob with appropriate quality
      const format = FORMAT_CONFIGS[downloadFormat]
      const qualityValue = downloadFormat === 'png' ? undefined : 0.9

      return new Promise((resolve) => {
        canvas.toBlob(resolve, format.mime, qualityValue)
      })
    } finally {
      setIsConverting(false)
    }
  }

  // Download the processed image in selected format
  const downloadImage = async () => {
    if (!processedImage) return
    
    try {
      let blob
      
      // If PNG, we can download directly from the API
      // For other formats, we need to convert
      if (downloadFormat === 'png') {
        const response = await fetch(processedImage)
        blob = await response.blob()
      } else {
        blob = await convertImage()
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const fileBaseName = originalFile.name.split('.').slice(0, -1).join('.')
      const format = FORMAT_CONFIGS[downloadFormat]
      link.download = `${fileBaseName}-no-bg.${format.extension}`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download image')
      console.error('Download error:', err)
    }
  }

  // Reset to start over
  const reset = () => {
    setOriginalFile(null)
    setOriginalImageUrl(null)
    setProcessedImage(null)
    setError(null)
    setSliderPosition(50)
    // Reset the file upload component
    if (fileUploadRef.current) {
      fileUploadRef.current.reset()
    }
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
      <style>{`
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .processing-spinner {
          animation: spin 1s linear infinite;
        }
        .processing-text {
          animation: pulse-scale 1.5s ease-in-out infinite;
          color: #000000;
          font-weight: 600;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Upload Section */}
      <FileUpload ref={fileUploadRef} onFileSelect={handleFileSelect} />

      {/* Process Button */}
      {originalFile && !processedImage && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleBackgroundRemoval}
            disabled={isProcessing}
            className={`btn-primary flex items-center gap-3 px-8 py-3 transition-all ${
              isProcessing ? 'opacity-90' : ''
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-6 h-6 processing-spinner text-black" />
                <span className="processing-text font-medium">Processing...</span>
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

          {/* Format Selection - Desktop only */}
          <div className="hidden sm:block p-4 bg-white dark:bg-zinc-800/50 rounded-xl border border-accent-100 dark:border-accent-900/30">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Download Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(FORMAT_CONFIGS).map(([format, config]) => (
                <button
                  key={format}
                  onClick={() => setDownloadFormat(format)}
                  className={`
                    py-2 px-3 rounded-lg border text-sm font-medium transition-all
                    ${downloadFormat === format
                      ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                      : 'border-accent-200 dark:border-accent-900/30 bg-white dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-accent-300 dark:hover:border-zinc-600'
                    }
                  `}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sticky Action Buttons */}
          <div className="sticky bottom-20 sm:bottom-4 z-40">
            <div className="flex justify-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-accent-100 dark:border-accent-900/30 shadow-lg">
              <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Start Over</span>
                <span className="sm:hidden">Reset</span>
              </button>
              {/* Mobile: Dropdown Button */}
              <div className="sm:hidden relative">
                <button 
                  onClick={() => setShowFormatDropdown(!showFormatDropdown)} 
                  disabled={isConverting}
                  className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                {showFormatDropdown && (
                  <div className="absolute bottom-full right-0 mb-2 w-32 bg-white dark:bg-zinc-800 border border-accent-200 dark:border-accent-900/30 rounded-lg shadow-lg overflow-hidden z-50">
                    {Object.entries(FORMAT_CONFIGS).map(([format, config]) => (
                      <button
                        key={format}
                        onClick={async () => {
                          setDownloadFormat(format)
                          setShowFormatDropdown(false)
                          setTimeout(downloadImage, 0)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-accent-500/10 dark:hover:bg-accent-500/20 text-zinc-700 dark:text-zinc-300"
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Desktop: Standard Button */}
              <button 
                onClick={downloadImage} 
                disabled={isConverting}
                className="hidden sm:flex btn-primary items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download {FORMAT_CONFIGS[downloadFormat].label}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default BackgroundRemover
