import { useState, useRef, useEffect } from 'react'
import { Download, Loader2, RefreshCw, Paintbrush, Eraser } from 'lucide-react'
import FileUpload from './FileUpload'
import { ImageTracer } from '@image-tracer-ts/core'

// Format configurations for download
const FORMAT_CONFIGS = {
  png: { mime: 'image/png', extension: 'png', label: 'PNG' },
  jpeg: { mime: 'image/jpeg', extension: 'jpg', label: 'JPEG' },
  webp: { mime: 'image/webp', extension: 'webp', label: 'WebP' },
  svg: { mime: 'image/svg+xml', extension: 'svg', label: 'SVG' },
}


function WatermarkRemover() {
  const [originalFile, setOriginalFile] = useState(null)
  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [brushSize, setBrushSize] = useState(30)
  const [isDrawing, setIsDrawing] = useState(false)
  const [opencvReady, setOpencvReady] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState('png')
  const [isConverting, setIsConverting] = useState(false)
  const [showFormatDropdown, setShowFormatDropdown] = useState(false)

  // Canvas refs for drawing mask
  const canvasRef = useRef(null)
  const maskCanvasRef = useRef(null)

  // Initialize OpenCV
useEffect(() => {
  const checkOpenCV = () => {
    if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
      console.log('OpenCV.js is ready')
      setOpencvReady(true)
      return true
    }
    return false
  }

  if (checkOpenCV()) return

  const interval = setInterval(() => {
    if (checkOpenCV()) {
      clearInterval(interval)
    }
  }, 100)

  return () => clearInterval(interval)
}, [])

  // Load image onto canvas when file is selected
  useEffect(() => {
    if (!originalFile || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const maskCanvas = maskCanvasRef.current
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })

    const img = new Image()
    img.onload = () => {
      // Set canvas size to match image (responsive to viewport)
      // Use smaller max width on mobile devices
      const viewportWidth = window.innerWidth
      const maxWidth = viewportWidth < 640 ? Math.min(viewportWidth - 48, 400) : 800
      const maxHeight = viewportWidth < 640 ? 400 : 600
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height
      maskCanvas.width = width
      maskCanvas.height = height

      // Draw image
      ctx.drawImage(img, 0, 0, width, height)
      
      // Clear mask canvas
      maskCtx.fillStyle = 'black'
      maskCtx.fillRect(0, 0, width, height)

      setOriginalImage(img)
    }
    img.src = URL.createObjectURL(originalFile)
  }, [originalFile])

  const handleFileSelect = (file) => {
    setOriginalFile(file)
    setProcessedImage(null)
    setError(null)
  }

  // Get coordinates from mouse or touch event
  const getEventCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Handle touch events
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }

    // Handle mouse events
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  // Drawing functions for the mask
  const startDrawing = (e) => {
    e.preventDefault() // Prevent scrolling on touch devices
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e) => {
    if (!isDrawing || !maskCanvasRef.current) return
    e.preventDefault() // Prevent scrolling on touch devices

    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })

    const { x, y } = getEventCoordinates(e)

    // Draw on mask (white = area to inpaint)
    maskCtx.fillStyle = 'white'
    maskCtx.beginPath()
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    maskCtx.fill()

    // Draw visible brush stroke on main canvas (semi-transparent red)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // Clear the mask and redraw original image
  const clearMask = () => {
    if (!canvasRef.current || !originalImage) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) 
    const maskCanvas = maskCanvasRef.current
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })

    // Redraw original image
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height)
    
    // Clear mask
    maskCtx.fillStyle = 'black'
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
  }

  // Process the image using OpenCV inpainting
  const processImage = async () => {
    if (!canvasRef.current || !maskCanvasRef.current || !opencvReady) {
      setError('OpenCV is not ready yet')
      return
    }
  
    setIsProcessing(true)
    setError(null)
  
    try {
      const canvas = canvasRef.current
      const maskCanvas = maskCanvasRef.current
      const cv = window.cv
  
      // Read the image from main canvas (imread returns RGBA on browser canvas)
      const srcRGBA = cv.imread(canvas)
      console.log('Source image channels:', srcRGBA.channels(), 'Type:', srcRGBA.type())
      
      // Convert RGBA to BGR (required for inpaint)
      const src = new cv.Mat()
      cv.cvtColor(srcRGBA, src, cv.COLOR_RGBA2BGR)
      
      // Read the mask from mask canvas
      const maskRaw = cv.imread(maskCanvas)
      console.log('Mask channels:', maskRaw.channels(), 'Type:', maskRaw.type())
      
      // Convert mask to single channel grayscale
      const grayMask = new cv.Mat()
      
      if (maskRaw.channels() === 4) {
        cv.cvtColor(maskRaw, grayMask, cv.COLOR_RGBA2GRAY)
      } else if (maskRaw.channels() === 3) {
        cv.cvtColor(maskRaw, grayMask, cv.COLOR_RGB2GRAY)
      } else {
        // Already single channel, just copy
        maskRaw.copyTo(grayMask)
      }
      
      // Ensure mask is binary (0 or 255) - white areas will be 255 (areas to inpaint)
      cv.threshold(grayMask, grayMask, 127, 255, cv.THRESH_BINARY)
      console.log('Mask after threshold, type:', grayMask.type())
      
      // Check if there are any white pixels (areas to inpaint)
      const nonZeroCount = cv.countNonZero(grayMask)
      console.log('Non-zero mask pixels:', nonZeroCount)
      if (nonZeroCount === 0) {
        throw new Error('No areas marked for inpainting. Please draw on the image with the brush.')
      }
      
      // Ensure mask is uint8 type
      const maskU8 = new cv.Mat()
      grayMask.convertTo(maskU8, cv.CV_8U)
      
      // Create destination Mat for the result
      const dst = new cv.Mat()
      
      // Apply inpainting - TELEA algorithm with radius of 5 pixels
      try {
        console.log('Attempting TELEA inpaint...')
        cv.inpaint(src, maskU8, dst, 5, cv.INPAINT_TELEA)
        console.log('TELEA succeeded')
      } catch (inpaintErr) {
        // If TELEA fails, try NS algorithm
        console.error('TELEA inpaint failed, trying NS algorithm:', inpaintErr)
        try {
          console.log('Attempting NS inpaint...')
          cv.inpaint(src, maskU8, dst, 5, cv.INPAINT_NS)
          console.log('NS algorithm succeeded')
        } catch (nsErr) {
          console.error('NS inpaint also failed:', nsErr)
          throw new Error('Inpainting algorithms failed. Please try with a larger brush size or different area.')
        }
      }
      
      // Convert result back to RGBA for canvas display
      const resultRGBA = new cv.Mat()
      cv.cvtColor(dst, resultRGBA, cv.COLOR_BGR2RGBA)
      
      // Show result on canvas
      cv.imshow(canvas, resultRGBA)
      
      // Export result
      setProcessedImage(canvas.toDataURL('image/png'))
      
      console.log('✅ Watermark removed using OpenCV inpainting')
  
    } catch (err) {
      console.error('Error details:', err)
      // Provide user-friendly error message
      if (err.message) {
        setError(err.message)
      } else if (typeof err === 'number') {
        // OpenCV error codes are numbers
        setError('OpenCV processing failed. Try drawing a larger area or reloading the page.')
      } else {
        setError('Failed to process image. Please check the console for details.')
      }
    } finally {
      // Cleanup: delete all Mat objects to prevent memory leaks
      try {
        if (typeof srcRGBA !== 'undefined' && srcRGBA && srcRGBA.data) srcRGBA.delete()
        if (typeof src !== 'undefined' && src && src.data) src.delete()
        if (typeof maskRaw !== 'undefined' && maskRaw && maskRaw.data) maskRaw.delete()
        if (typeof grayMask !== 'undefined' && grayMask && grayMask.data) grayMask.delete()
        if (typeof maskU8 !== 'undefined' && maskU8 && maskU8.data) maskU8.delete()
        if (typeof dst !== 'undefined' && dst && dst.data) dst.delete()
        if (typeof resultRGBA !== 'undefined' && resultRGBA && resultRGBA.data) resultRGBA.delete()
      } catch (cleanupErr) {
        console.warn('Cleanup error:', cleanupErr)
      }
      setIsProcessing(false)
    }
  }

  // Convert image to SVG using image tracing
  const convertToSVG = async (img) => {
    try {
      // Draw image to canvas to get ImageData
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

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

      // Create canvas with appropriate settings for other formats
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      // For JPEG, fill with white background (no transparency support)
      if (downloadFormat === 'jpeg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Draw the image
      ctx.drawImage(img, 0, 0)

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
      
      // If PNG, we can download directly from the data URL
      // For other formats, we need to convert
      if (downloadFormat === 'png') {
        const response = await fetch(processedImage)
        blob = await response.blob()
      } else {
        blob = await convertImage()
      }

      const fileBaseName = originalFile.name.split('.').slice(0, -1).join('.')
      const format = FORMAT_CONFIGS[downloadFormat]
      const filename = `${fileBaseName}-cleaned.${format.extension}`

      // Use Web Share API on mobile for better UX (save to Photos)
      if (navigator.share && /android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())) {
        const file = new File([blob], filename, { type: blob.type })
        await navigator.share({
          files: [file],
          title: 'Image',
          text: filename
        })
      } else {
        // Fallback: traditional download
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      // Silently fail on share API cancellation, or log other errors
      if (err.name !== 'AbortError') {
        setError('Failed to download image')
        console.error('Download error:', err)
      }
    }
  }

  const reset = () => {
    setOriginalFile(null)
    setOriginalImage(null)
    setProcessedImage(null)
    setError(null)
  }

  return (
    <div>
      {/* Upload Section - only show if no file */}
      {!originalFile && (
        <FileUpload onFileSelect={handleFileSelect} />
      )}

      {/* Canvas Drawing Section */}
      {originalFile && !processedImage && (
        <div className="space-y-6">
          {/* Brush Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Paintbrush className="w-5 h-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
              <label className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">Brush:</label>
              <input
                type="range"
                min="10"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="flex-1 sm:w-32 accent-accent-500"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-500 w-12 text-right">{brushSize}px</span>
            </div>
            <button onClick={clearMask} className="btn-secondary flex items-center justify-center gap-2 text-sm py-2 px-4">
              <Eraser className="w-4 h-4" />
              Clear
            </button>
          </div>

          {/* Canvas */}
          <div className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-800 flex justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
              onTouchMove={draw}
              className="cursor-crosshair max-w-full"
              style={{ touchAction: 'none' }}
            />
            {/* Hidden mask canvas */}
            <canvas ref={maskCanvasRef} className="hidden" />
          </div>

          <p className="text-center text-zinc-600 dark:text-zinc-500 text-sm">
            Paint over the watermark with your mouse, then click "Remove Watermark"
          </p>

          {/* Process Button */}
          <div className="flex justify-center gap-4">
            <button onClick={reset} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={processImage}
              disabled={isProcessing || !opencvReady}
              className="btn-primary flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : !opencvReady ? (
                'Loading...'
              ) : (
                'Remove Watermark'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Result Section */}
      {processedImage && (
        <div className="space-y-6">
          <div className="preview-container aspect-video flex items-center justify-center p-4">
            <img
              src={processedImage}
              alt="Processed"
              className="max-w-full max-h-full object-contain"
            />
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

export default WatermarkRemover