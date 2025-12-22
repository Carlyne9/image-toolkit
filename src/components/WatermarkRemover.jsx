import { useState, useRef, useEffect } from 'react'
import { Download, Loader2, RefreshCw, Paintbrush, Eraser } from 'lucide-react'
import FileUpload from './FileUpload'


function WatermarkRemover() {
  const [originalFile, setOriginalFile] = useState(null)
  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [brushSize, setBrushSize] = useState(30)
  const [isDrawing, setIsDrawing] = useState(false)
  const [opencvReady, setOpencvReady] = useState(false)
  
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
      // Set canvas size to match image (with max dimensions)
      const maxWidth = 800
      const maxHeight = 600
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

  // Drawing functions for the mask
  const startDrawing = (e) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const draw = (e) => {
    if (!isDrawing || !maskCanvasRef.current) return

    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) 
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true }) 
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

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

  const downloadImage = () => {
    if (!processedImage) return
    
    const link = document.createElement('a')
    link.href = processedImage
    link.download = `${originalFile.name.split('.')[0]}-cleaned.png`
    link.click()
  }

  const reset = () => {
    setOriginalFile(null)
    setOriginalImage(null)
    setProcessedImage(null)
    setError(null)
  }

  return (
    <div className="card p-8">
      {/* Upload Section - only show if no file */}
      {!originalFile && (
        <>
          <FileUpload onFileSelect={handleFileSelect} />
          <div className="mt-8 text-center text-zinc-600 dark:text-zinc-500 text-sm">
            <p>Upload an image, then paint over the watermark you want to remove.</p>
          </div>
        </>
      )}

      {/* Canvas Drawing Section */}
      {originalFile && !processedImage && (
        <div className="space-y-6">
          {/* Brush Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Paintbrush className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Brush Size:</label>
              <input
                type="range"
                min="10"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-32 accent-accent-500"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-500 w-8">{brushSize}px</span>
            </div>
            <button onClick={clearMask} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
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

          <div className="flex justify-center gap-4">
            <button onClick={reset} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Start Over
            </button>
            <button onClick={downloadImage} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WatermarkRemover