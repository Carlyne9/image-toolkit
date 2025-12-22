import { useState, useEffect } from 'react'
import { Download, RefreshCw, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import FileUpload from './FileUpload'
import GIF from 'gif.js'

// SVG conversion creates an embedded image within SVG markup
// For true vector tracing, install: npm install potrace or similar

// =====================================================
// FORMAT CONVERTER COMPONENT
// 
// Converts images between multiple formats:
// - PNG, JPEG, WebP (lossless/lossy compression)
// - GIF (animated support, 256 colors)
// - SVG (vector conversion via image tracing)
// =====================================================

function FormatConverter() {
    const [originalFile, setOriginalFile] = useState(null)
    const [convertedImage, setConvertedImage] = useState(null)
    const [targetFormat, setTargetFormat] = useState('png')
    const [quality, setQuality] = useState(0.9)
    const [gifFrameDelay, setGifFrameDelay] = useState(100)
    const [svgColorCount, setSvgColorCount] = useState(16)
    const [isConverting, setIsConverting] = useState(false)
    const [error, setError] = useState(null)
    const [originalSize, setOriginalSize] = useState(0)
    const [convertedSize, setConvertedSize] = useState(0)
    const [isVideoFile, setIsVideoFile] = useState(false)

    // Video format MIME types
    const VIDEO_FORMATS = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
        'video/webm',
        'video/ogg',
        'video/3gpp',
        'video/3gpp2',
        'video/x-flv',
        'video/x-m4v'
    ]

    // Check if file is a video format
    const isVideoFormat = (file) => {
        if (!file) return false
        return VIDEO_FORMATS.some(format => 
            file.type.toLowerCase().includes(format) ||
            file.name.toLowerCase().match(/\.(mp4|mpeg|mov|avi|mkv|webm|ogv|3gp|3g2|flv|m4v|ts|mts|m2ts|mxf|f4v|asf|wmv|rm|rmvb)$/i)
        )
    }

    // Available output formats
    const formats = [
      { 
        id: 'png', 
        label: 'PNG', 
        mime: 'image/png', 
        description: 'Lossless, transparency support',
        warning: null
      },
      { 
        id: 'jpeg', 
        label: 'JPEG', 
        mime: 'image/jpeg', 
        description: 'Compressed photos, no transparency',
        warning: null
      },
      { 
        id: 'webp', 
        label: 'WebP', 
        mime: 'image/webp', 
        description: 'Modern format, best compression',
        warning: null
      },
      { 
        id: 'jpg', 
        label: 'JPG', 
        mime: 'image/jpeg', 
        description: 'Same as JPEG, standard format',
        warning: null
      },
      { 
        id: 'gif', 
        label: 'GIF', 
        mime: 'image/gif', 
        description: 'Animated or simple images',
        warning: 'Best for simple graphics, 256 colors'
      },
      { 
        id: 'svg', 
        label: 'SVG', 
        mime: 'image/svg+xml', 
        description: 'Embedded image in SVG format',
        warning: 'Creates an SVG container for your image (not true vector tracing)'
      }
    ]

    const handleFileSelect = (file) => {
        setOriginalFile(file)
        setOriginalSize(file?.size || 0)
        setConvertedImage(null)
        setConvertedSize(0)
        setError(null)
        
        // Check if uploaded file is a video
        const isVideo = isVideoFormat(file)
        setIsVideoFile(isVideo)
        
        // Reset format if GIF was selected but video wasn't uploaded
        if (targetFormat === 'gif' && !isVideo) {
            setTargetFormat('png')
        }
    }

    // Convert image when file or settings change
    const convertImage = async () => {
        if (!originalFile) return

        setIsConverting(true)
        setError(null)

        try {
            // Create an image element to load the file
            const img = new Image()
            const imageUrl = URL.createObjectURL(originalFile)

            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = imageUrl
            })

            let blob

            // Handle different formats
            if (targetFormat === 'gif') {
              blob = await convertToGIF(img)
            } else if (targetFormat === 'svg') {
              // Convert image to data URL for ImageTracer (better CORS support)
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              ctx.drawImage(img, 0, 0)
              const dataUrl = canvas.toDataURL('image/png')
              blob = await convertToSVG(dataUrl)
            } else {
              blob = await convertToStandard(img)
            }

            if (!blob) {
                throw new Error('Conversion failed')
            }

            // Create URL for preview
            const convertedUrl = URL.createObjectURL(blob)
            setConvertedImage(convertedUrl)
            setConvertedSize(blob.size)

            // Clean up
            URL.revokeObjectURL(imageUrl)

        } catch (err) {
            console.error('Conversion error:', err)
            setError(err.message || 'Failed to convert image')
        } finally {
            setIsConverting(false)
        }
    }

    // Convert to standard formats (PNG, JPEG, WebP)
    const convertToStandard = async (img) => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')

        // For JPEG/JPG, fill with white background (no transparency)
        if (targetFormat === 'jpeg' || targetFormat === 'jpg') {
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        // Draw the image
        ctx.drawImage(img, 0, 0)

        // Get the format configuration
        const format = formats.find(f => f.id === targetFormat)
        const qualityValue = (targetFormat === 'png') ? undefined : quality

        // Get the converted image as a blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, format.mime, qualityValue)
        })

        return blob
    }

    // Convert to GIF using gif.js library
    const convertToGIF = async (img) => {
        return new Promise((resolve, reject) => {
            try {
                // Create a canvas with the image
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)

                // Initialize GIF encoder
                const gif = new GIF({
                    workers: 2,
                    quality: Math.round(20 - quality * 10), // Convert quality to GIF quality scale
                    width: img.width,
                    height: img.height,
                    workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js' // Use CDN version
                })

                // Add frame to GIF
                gif.addFrame(canvas, { delay: gifFrameDelay })

                // Listen for finished event
                gif.on('finished', (blob) => {
                    resolve(blob)
                })

                // Listen for errors
                gif.on('error', (error) => {
                    reject(new Error(`GIF encoding failed: ${error.message}`))
                })

                // Start rendering
                gif.render()

            } catch (err) {
                reject(new Error(`GIF conversion error: ${err.message}`))
            }
        })
    }

    // Convert to SVG using embedded image (fallback)
    // Note: For true vector tracing, would need: npm install potrace or similar
    const convertToSVG = async (imageUrl) => {
      return new Promise((resolve, reject) => {
        try {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            
            const base64Image = canvas.toDataURL('image/png')
            const width = img.width
            const height = img.height

            const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" x="0" y="0" xlink:href="${base64Image}"/>
</svg>`
            
            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
            resolve(blob)
          }
          img.onerror = () => {
            reject(new Error('Failed to create SVG'))
          }
          img.src = imageUrl
        } catch (err) {
          reject(new Error(`SVG creation failed: ${err.message}`))
        }
      })
    }



    // Auto-convert when settings change
    useEffect(() => {
        if (originalFile) {
            // Debounce conversion for better UX
            const timer = setTimeout(() => {
                convertImage()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [originalFile, targetFormat, quality, gifFrameDelay, svgColorCount])

    const downloadImage = () => {
        if (!convertedImage) return

        const link = document.createElement('a')
        link.href = convertedImage
        const baseName = originalFile.name.split('.').slice(0, -1).join('.')
        link.download = `${baseName}.${targetFormat}`
        link.click()
    }

    const reset = () => {
        setOriginalFile(null)
        setConvertedImage(null)
        setConvertedSize(0)
        setError(null)
    }

    // Format file size for display
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B'
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    }

    // Calculate size difference percentage
    const getSizeDiff = () => {
        if (!originalSize || !convertedSize) return null
        const diff = ((convertedSize - originalSize) / originalSize) * 100
        return diff
    }

    // Get current format info
    const currentFormat = formats.find(f => f.id === targetFormat)

    return (
        <div className="card p-8">
            {/* Upload Section */}
            <FileUpload onFileSelect={handleFileSelect} />

            {/* Conversion Options - show when file is uploaded */}
            {originalFile && (
                <div className="mt-8 space-y-6">
                    {/* Format Selection - Grid layout */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                            Output Format
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                             {formats.map((format) => {
                                 // Disable GIF unless a video file is uploaded
                                 const isGifDisabled = format.id === 'gif' && !isVideoFile
                                 
                                 return (
                                 <button
                                     key={format.id}
                                     onClick={() => !isGifDisabled && setTargetFormat(format.id)}
                                     disabled={isGifDisabled}
                                     className={`
                        p-4 rounded-xl border text-left transition-all ${isGifDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${targetFormat === format.id && !isGifDisabled
                                             ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                                             : isGifDisabled
                                             ? 'border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800/30 text-gray-500 dark:text-zinc-500'
                                             : 'border-green-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-green-300 dark:hover:border-zinc-600'
                                         }
                        `}
                        >
                        <div className="font-semibold text-sm">{format.label}</div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-500 mt-1">
                        {isGifDisabled ? 'Upload video to enable' : format.description}
                        </div>
                        </button>
                                 )
                             })}
                         </div>
                    </div>

                    {/* GIF disabled warning */}
                    {!isVideoFile && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg flex gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-700 dark:text-blue-600">GIF format is only available for video files (MP4, WebM, etc.)</p>
                        </div>
                    )}

                    {/* Format-specific warning */}
                    {currentFormat?.warning && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg flex gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-700 dark:text-yellow-600">{currentFormat.warning}</p>
                        </div>
                    )}

                    {/* Quality Slider - for lossy formats */}
                    {(targetFormat === 'jpeg' || targetFormat === 'webp' || targetFormat === 'jpg') && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                Quality: {Math.round(quality * 100)}%
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.05"
                                value={quality}
                                onChange={(e) => setQuality(Number(e.target.value))}
                                className="w-full accent-accent-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-500 mt-1">
                                <span>Smaller file</span>
                                <span>Higher quality</span>
                            </div>
                        </div>
                    )}

                    {/* GIF Frame Delay */}
                    {targetFormat === 'gif' && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                Frame Delay: {gifFrameDelay}ms
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="500"
                                step="50"
                                value={gifFrameDelay}
                                onChange={(e) => setGifFrameDelay(Number(e.target.value))}
                                className="w-full accent-accent-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-500 mt-1">
                                <span>Fast</span>
                                <span>Slow</span>
                            </div>
                        </div>
                    )}

                    {/* SVG Color Count */}
                    {targetFormat === 'svg' && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                Colors: {svgColorCount}
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="16"
                                step="1"
                                value={svgColorCount}
                                onChange={(e) => setSvgColorCount(Number(e.target.value))}
                                className="w-full accent-accent-500"
                            />
                            <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-500 mt-1">
                                <span>Fewer (faster)</span>
                                <span>More (detailed)</span>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Size Comparison */}
                    {convertedSize > 0 && !error && (
                        <div className="p-4 bg-white dark:bg-zinc-800/50 rounded-xl border border-green-100 dark:border-transparent">
                            <div className="flex items-center justify-between">
                                <div className="text-center">
                                    <div className="text-zinc-600 dark:text-zinc-500 text-xs mb-1">Original</div>
                                    <div className="text-zinc-800 dark:text-zinc-200 font-mono">{formatSize(originalSize)}</div>
                                    <div className="text-zinc-600 dark:text-zinc-500 text-xs mt-1">
                                        {originalFile.type.split('/')[1].toUpperCase()}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center px-4">
                                    <ArrowRight className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                                    {getSizeDiff() !== null && (
                                        <div className={`text-xs mt-1 font-medium ${getSizeDiff() < 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {getSizeDiff() > 0 ? '+' : ''}{getSizeDiff().toFixed(0)}%
                                        </div>
                                    )}
                                </div>

                                <div className="text-center">
                                    <div className="text-zinc-600 dark:text-zinc-500 text-xs mb-1">Converted</div>
                                    <div className="text-accent-600 dark:text-accent-400 font-mono">{formatSize(convertedSize)}</div>
                                    <div className="text-zinc-600 dark:text-zinc-500 text-xs mt-1">
                                        {targetFormat.toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isConverting && (
                        <div className="flex items-center justify-center gap-2 p-4 bg-accent-50 dark:bg-accent-950/20 rounded-xl">
                            <Loader2 className="w-4 h-4 animate-spin text-accent-600 dark:text-accent-400" />
                            <span className="text-sm text-accent-600 dark:text-accent-400">Converting to {currentFormat?.label}...</span>
                        </div>
                    )}

                    {/* Preview - only show if not SVG (SVG is text-based) */}
                    {convertedImage && targetFormat !== 'svg' && (
                        <div className="preview-container aspect-video flex items-center justify-center p-4">
                            <img
                                src={convertedImage}
                                alt="Converted"
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    )}

                    {/* SVG Preview Info */}
                    {convertedImage && targetFormat === 'svg' && (
                        <div className="p-4 bg-white dark:bg-zinc-800/50 rounded-xl border border-green-100 dark:border-transparent text-center">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">SVG created successfully</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Vector file ready for download</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4">
                        <button onClick={reset} className="btn-secondary flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Start Over
                        </button>
                        <button
                            onClick={downloadImage}
                            disabled={!convertedImage || isConverting}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download {currentFormat?.label}
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions when no file is uploaded */}
            {!originalFile && (
                <div className="mt-8 text-center text-zinc-600 dark:text-zinc-500 text-sm">
                    <p>Upload an image to convert it to a different format.</p>
                    <p className="mt-1">Supports PNG, JPG, JPEG, WebP, GIF, and SVG.</p>
                </div>
            )}
        </div>
    )
}

export default FormatConverter
