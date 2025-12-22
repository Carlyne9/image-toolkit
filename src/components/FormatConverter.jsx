import { useState, useEffect } from 'react'
import { Download, RefreshCw, ArrowRight, AlertCircle, Loader2, Palette } from 'lucide-react'
import FileUpload from './FileUpload'
import GIF from 'gif.js'
import { ImageTracer } from '@image-tracer-ts/core'

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
    const [svgColorCount, setSvgColorCount] = useState(16)
    const [svgMode, setSvgMode] = useState('color') // 'color' | 'monochrome'
    const [isConverting, setIsConverting] = useState(false)
    const [conversionProgress, setConversionProgress] = useState(0) // 0-100 for video-to-GIF
    const [error, setError] = useState(null)
    const [originalSize, setOriginalSize] = useState(0)
    const [convertedSize, setConvertedSize] = useState(0)
    // SVG colorizer state
    const [svgContent, setSvgContent] = useState(null) // Raw SVG string for color editing
    const [svgColors, setSvgColors] = useState([]) // Extracted colors from SVG
    const [originalSvgColors, setOriginalSvgColors] = useState([]) // Original colors for replacement tracking

    // All available output formats
    const allFormats = [
        {
            id: 'png',
            label: 'PNG',
            mime: 'image/png',
            description: 'Lossless, transparency support',
            icon: '🖼️',
            warning: null
        },
        {
            id: 'jpeg',
            label: 'JPEG',
            mime: 'image/jpeg',
            description: 'Compressed photos, no transparency',
            icon: '📷',
            warning: null
        },
        {
            id: 'webp',
            label: 'WebP',
            mime: 'image/webp',
            description: 'Modern format, best compression',
            icon: '⚡',
            warning: null
        },
        {
            id: 'gif',
            label: 'GIF',
            mime: 'image/gif',
            description: 'Animated or simple graphics',
            icon: '🎬',
            warning: 'Limited to 256 colors'
        },
        {
            id: 'svg',
            label: 'SVG',
            mime: 'image/svg+xml',
            description: 'Scalable vector graphics',
            icon: '✨',
            warning: 'Best for icons & illustrations, not photos'
        },
    ]

    // Get input format from file type
    const getInputFormat = (file) => {
        if (!file) return null
        const type = file.type.toLowerCase()
        if (type === 'image/png') return 'png'
        if (type === 'image/jpeg' || type === 'image/jpg') return 'jpeg'
        if (type === 'image/webp') return 'webp'
        if (type === 'image/gif') return 'gif'
        if (type === 'image/svg+xml') return 'svg'
        if (type.startsWith('video/')) return 'video'
        return null
    }

    // Check if input is a video
    const isVideoInput = () => getInputFormat(originalFile) === 'video'

    // Filter formats based on input type
    const getAvailableFormats = () => {
        const inputFormat = getInputFormat(originalFile)

        // Video input: only GIF output available
        if (inputFormat === 'video') {
            return allFormats.filter(f => f.id === 'gif')
        }

        return allFormats.filter(format => {
            // Don't show same format as input
            if (format.id === inputFormat) return false

            // GIF output only available when input is GIF or video
            if (format.id === 'gif' && inputFormat !== 'gif' && inputFormat !== 'video') return false

            // SVG output (tracing) only for raster inputs, not SVG
            if (format.id === 'svg' && inputFormat === 'svg') return false

            return true
        })
    }

    const formats = getAvailableFormats()

    const handleFileSelect = (file) => {
        setOriginalFile(file)
        setOriginalSize(file?.size || 0)
        setConvertedImage(null)
        setConvertedSize(0)
        setError(null)

        // Reset target format based on new file type
        if (file) {
            const inputFormat = getInputFormat(file)

            // Video input: auto-select GIF
            if (inputFormat === 'video') {
                setTargetFormat('gif')
                return
            }

            // If target is same as input, or GIF when input isn't GIF/video, or SVG when input is SVG
            const needsReset =
                targetFormat === inputFormat ||
                (targetFormat === 'gif' && inputFormat !== 'gif' && inputFormat !== 'video') ||
                (targetFormat === 'svg' && inputFormat === 'svg')

            if (needsReset) {
                setTargetFormat('png')
            }
        }
    }

    // Convert file when file or settings change
    const convertImage = async () => {
        if (!originalFile) return

        setIsConverting(true)
        setError(null)

        try {
            const fileUrl = URL.createObjectURL(originalFile)
            let blob

            // Handle video input separately
            if (isVideoInput()) {
                blob = await convertVideoToGIF(fileUrl)
            } else {
                // Create an image element to load the file
                const img = new Image()

                await new Promise((resolve, reject) => {
                    img.onload = resolve
                    img.onerror = reject
                    img.src = fileUrl
                })

                // Handle different formats
                if (targetFormat === 'gif') {
                    blob = await convertToGIF(img)
                } else if (targetFormat === 'svg') {
                    blob = await convertToSVG(img)
                } else {
                    blob = await convertToStandard(img)
                }
            }

            if (!blob) {
                throw new Error('Conversion failed')
            }

            // Create URL for preview
            const convertedUrl = URL.createObjectURL(blob)
            setConvertedImage(convertedUrl)
            setConvertedSize(blob.size)

            // Clean up
            URL.revokeObjectURL(fileUrl)

        } catch (err) {
            console.error('Conversion error:', err)
            setError(err.message || 'Failed to convert')
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

        // Get the format configuration (use allFormats since formats is filtered)
        const format = allFormats.find(f => f.id === targetFormat)
        const qualityValue = (targetFormat === 'png') ? undefined : quality

        // Get the converted image as a blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, format.mime, qualityValue)
        })

        return blob
    }

    // Convert to GIF using gif.js library (for static images)
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
                    quality: Math.round(20 - quality * 10),
                    width: img.width,
                    height: img.height,
                    workerScript: '/gif.worker.js'
                })

                // Add frame to GIF
                gif.addFrame(canvas, { delay: 100 })

                gif.on('finished', (blob) => resolve(blob))
                gif.on('error', (error) => reject(new Error(`GIF encoding failed: ${error.message}`)))
                gif.render()

            } catch (err) {
                reject(new Error(`GIF conversion error: ${err.message}`))
            }
        })
    }

    // Convert video to animated GIF
    const convertVideoToGIF = async (videoUrl) => {
        return new Promise((resolve, reject) => {
            try {
                const video = document.createElement('video')
                video.crossOrigin = 'anonymous'
                video.muted = true
                video.playsInline = true

                video.onloadedmetadata = async () => {
                    try {
                        // Limit dimensions for performance (max 480px width)
                        const maxWidth = 480
                        const scale = Math.min(1, maxWidth / video.videoWidth)
                        const width = Math.round(video.videoWidth * scale)
                        const height = Math.round(video.videoHeight * scale)

                        // Limit duration to 10 seconds
                        const maxDuration = 10
                        const duration = Math.min(video.duration, maxDuration)

                        // Calculate frames (10 fps)
                        const fps = 10
                        const frameCount = Math.floor(duration * fps)
                        const frameDelay = 1000 / fps

                        // Create canvas for frame capture
                        const canvas = document.createElement('canvas')
                        canvas.width = width
                        canvas.height = height
                        const ctx = canvas.getContext('2d')

                        // Initialize GIF encoder
                        const gif = new GIF({
                            workers: 2,
                            quality: 10,
                            width,
                            height,
                            workerScript: '/gif.worker.js'
                        })

                        // Capture frames
                        setConversionProgress(0)
                        for (let i = 0; i < frameCount; i++) {
                            const time = (i / fps)
                            video.currentTime = time

                            await new Promise(r => {
                                video.onseeked = r
                            })

                            ctx.drawImage(video, 0, 0, width, height)
                            gif.addFrame(ctx, { copy: true, delay: frameDelay })

                            // Update progress (frames captured = 0-70%, encoding = 70-100%)
                            setConversionProgress(Math.round((i / frameCount) * 70))
                        }

                        gif.on('progress', (p) => {
                            // Encoding progress (70-100%)
                            setConversionProgress(70 + Math.round(p * 30))
                        })
                        gif.on('finished', (blob) => {
                            setConversionProgress(100)
                            resolve(blob)
                        })
                        gif.on('error', (error) => reject(new Error(`GIF encoding failed: ${error.message}`)))
                        gif.render()

                    } catch (err) {
                        reject(new Error(`Frame capture error: ${err.message}`))
                    }
                }

                video.onerror = () => reject(new Error('Failed to load video'))
                video.src = videoUrl

            } catch (err) {
                reject(new Error(`Video conversion error: ${err.message}`))
            }
        })
    }

    // Extract unique colors from SVG string
    // Returns array of {original: string, hex: string} objects
    const extractColorsFromSVG = (svgString) => {
        const colors = []
        const seenHex = new Set()

        // Match fill and stroke colors (hex, rgb, rgba)
        const hexPattern = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g
        const rgbPattern = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi

        // Extract hex colors
        let match
        while ((match = hexPattern.exec(svgString)) !== null) {
            const original = match[0]
            const hex = original.toLowerCase()
            // Skip white and black for cleaner palette
            if (hex !== '#ffffff' && hex !== '#fff' && hex !== '#000000' && hex !== '#000') {
                if (!seenHex.has(hex)) {
                    seenHex.add(hex)
                    colors.push({ original, hex })
                }
            }
        }

        // Extract rgb colors
        while ((match = rgbPattern.exec(svgString)) !== null) {
            const original = match[0]
            const r = parseInt(match[1])
            const g = parseInt(match[2])
            const b = parseInt(match[3])
            const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
            if (hex !== '#ffffff' && hex !== '#000000' && !seenHex.has(hex)) {
                seenHex.add(hex)
                colors.push({ original, hex })
            }
        }

        return colors.slice(0, 12) // Limit to 12 colors for UI
    }

    // Replace a color in SVG string
    const replaceColorInSVG = (svgString, oldColor, newColor) => {
        // Escape special regex characters in oldColor
        const escaped = oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escaped, 'gi')
        return svgString.replace(regex, newColor)
    }

    // Handle color change from picker
    const handleColorChange = (colorIndex, newColor) => {
        if (!svgContent || !originalSvgColors[colorIndex]) return

        // Build the new colors array with the change (hex values for display)
        const newColors = [...svgColors]
        newColors[colorIndex] = newColor
        setSvgColors(newColors)

        // Rebuild SVG from original content with all current color mappings
        let updatedSvg = svgContent

        // Replace ALL original colors with their NEW mapped values
        // Use originalSvgColors which has the ORIGINAL string format (hex or rgb)
        // and newColors which has the new hex values
        originalSvgColors.forEach((colorObj, idx) => {
            const targetColor = newColors[idx]
            // Replace the original format with the new hex color
            if (colorObj.hex !== targetColor) {
                updatedSvg = replaceColorInSVG(updatedSvg, colorObj.original, targetColor)
            }
        })

        // Update preview and blob
        const blob = new Blob([updatedSvg], { type: 'image/svg+xml' })
        const convertedUrl = URL.createObjectURL(blob)
        setConvertedImage(convertedUrl)
        setConvertedSize(blob.size)
    }

    // Convert to SVG using @image-tracer-ts/core
    const convertToSVG = async (img) => {
        try {
            // Draw image to canvas to get ImageData
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

            // Configure tracer based on mode
            const options = svgMode === 'monochrome'
                ? {
                    // Monochrome: best for line art, icons, signatures
                    numberOfColors: 2,
                    colorSamplingMode: 'generate',
                    fillStyle: 'fill',
                    strokeWidth: 0,
                    lineErrorMargin: 0.5,
                    curveErrorMargin: 0.5,
                    enhanceRightAngles: true,
                }
                : {
                    // Color: best for flat illustrations, logos
                    numberOfColors: svgColorCount,
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

            // Store SVG content for color editing
            setSvgContent(svgString)

            // Extract colors for the color picker
            // colors is array of {original, hex} objects
            const colorObjects = extractColorsFromSVG(svgString)
            const hexColors = colorObjects.map(c => c.hex) // Just hex for display/editing
            setSvgColors(hexColors)
            setOriginalSvgColors(colorObjects) // Keep full objects with original format

            // Convert SVG string to blob
            const blob = new Blob([svgString], { type: 'image/svg+xml' })
            return blob
        } catch (err) {
            throw new Error(`SVG conversion error: ${err.message}`)
        }
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
    }, [originalFile, targetFormat, quality, svgColorCount, svgMode])

    const downloadImage = () => {
        if (!convertedImage) return

        const link = document.createElement('a')

        // For SVG with edited colors, rebuild from original with color replacements
        if (targetFormat === 'svg' && svgContent && originalSvgColors.length > 0) {
            let finalSvg = svgContent
            originalSvgColors.forEach((colorObj, idx) => {
                const targetColor = svgColors[idx]
                if (colorObj.hex !== targetColor) {
                    finalSvg = replaceColorInSVG(finalSvg, colorObj.original, targetColor)
                }
            })
            const blob = new Blob([finalSvg], { type: 'image/svg+xml' })
            link.href = URL.createObjectURL(blob)
        } else {
            link.href = convertedImage
        }

        const baseName = originalFile.name.split('.').slice(0, -1).join('.')
        // Use .jpg extension for JPEG (more common than .jpeg)
        const extension = targetFormat === 'jpeg' ? 'jpg' : targetFormat
        link.download = `${baseName}.${extension}`
        link.click()
    }

    const reset = () => {
        setOriginalFile(null)
        setConvertedImage(null)
        setConvertedSize(0)
        setError(null)
        // Reset SVG colorizer state
        setSvgContent(null)
        setSvgColors([])
        setOriginalSvgColors([])
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
    // Use allFormats to always find format info (formats is filtered)
    const currentFormat = allFormats.find(f => f.id === targetFormat)

    return (
        <div>
            {/* Upload Section */}
            <FileUpload
                onFileSelect={handleFileSelect}
                acceptedTypes="image/*,video/*"
                maxSizeMB={50}
                helpText="Images (PNG, JPEG, WebP, GIF, SVG) or videos for GIF"
            />

            {/* Conversion Options - show when file is uploaded */}
            {originalFile && (
                <div className="mt-8 space-y-6">
                    {/* Format Selection - Grid layout */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                            Output Format
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {formats.map((format) => (
                                <button
                                    key={format.id}
                                    onClick={() => setTargetFormat(format.id)}
                                    className={`
                    p-4 rounded-xl border text-left transition-all
                    ${targetFormat === format.id
                                            ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                                            : 'border-green-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:border-green-300 dark:hover:border-zinc-600'
                                        }
                  `}
                                >
                                    <div className="text-xl mb-1">{format.icon}</div>
                                    <div className="font-semibold text-sm">{format.label}</div>
                                    <div className="text-xs text-zinc-600 dark:text-zinc-500 mt-1">{format.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

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

                    {/* SVG Tracing Options */}
                    {targetFormat === 'svg' && (
                        <div className="space-y-4">
                            {/* Tracing Mode */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                    Tracing Mode
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setSvgMode('color')}
                                        className={`p-3 rounded-lg border text-left transition-all ${
                                            svgMode === 'color'
                                                ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                        }`}
                                    >
                                        <div className="font-medium text-sm">Color</div>
                                        <div className="text-xs text-zinc-500 mt-1">Flat illustrations, logos</div>
                                    </button>
                                    <button
                                        onClick={() => setSvgMode('monochrome')}
                                        className={`p-3 rounded-lg border text-left transition-all ${
                                            svgMode === 'monochrome'
                                                ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                                        }`}
                                    >
                                        <div className="font-medium text-sm">Monochrome</div>
                                        <div className="text-xs text-zinc-500 mt-1">Line art, icons, signatures</div>
                                    </button>
                                </div>
                            </div>

                            {/* Color Count - only for color mode */}
                            {svgMode === 'color' && (
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                        Colors: {svgColorCount}
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="32"
                                        step="1"
                                        value={svgColorCount}
                                        onChange={(e) => setSvgColorCount(Number(e.target.value))}
                                        className="w-full accent-accent-500"
                                    />
                                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-500 mt-1">
                                        <span>Simpler</span>
                                        <span>More detailed</span>
                                    </div>
                                </div>
                            )}
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
                        <div className="p-4 bg-accent-50 dark:bg-accent-950/20 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-accent-600 dark:text-accent-400" />
                                    <span className="text-sm text-accent-600 dark:text-accent-400">
                                        {isVideoInput()
                                            ? (conversionProgress < 70 ? 'Capturing frames...' : 'Encoding GIF...')
                                            : `Converting to ${currentFormat?.label}...`
                                        }
                                    </span>
                                </div>
                                {isVideoInput() && (
                                    <span className="text-sm font-medium text-accent-600 dark:text-accent-400">
                                        {conversionProgress}%
                                    </span>
                                )}
                            </div>
                            {isVideoInput() && (
                                <div className="h-2 bg-accent-200 dark:bg-accent-900/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent-500 transition-all duration-200 ease-out"
                                        style={{ width: `${conversionProgress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview - works for all formats including SVG */}
                    {convertedImage && (
                        <div className="space-y-4">
                            <div className="preview-container aspect-video flex items-center justify-center p-4">
                                <img
                                    src={convertedImage}
                                    alt="Converted"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>

                            {/* SVG Color Editor */}
                            {targetFormat === 'svg' && svgColors.length > 0 && (
                                <div className="p-4 bg-white dark:bg-zinc-800/50 rounded-xl border border-green-100 dark:border-zinc-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                Recolor SVG
                                            </span>
                                        </div>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {svgColors.length} color{svgColors.length !== 1 ? 's' : ''} detected
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                                        Tap any color below to replace it
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {svgColors.map((color, index) => (
                                            <label
                                                key={index}
                                                className="group relative w-10 h-10 rounded-full cursor-pointer transition-all hover:scale-110"
                                            >
                                                {/* Color swatch */}
                                                <div
                                                    className="w-full h-full rounded-full border-2 border-white dark:border-zinc-600 shadow-md group-hover:shadow-lg group-hover:ring-2 group-hover:ring-accent-500/50"
                                                    style={{ backgroundColor: color }}
                                                />
                                                {/* Edit indicator on hover */}
                                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </div>
                                                <input
                                                    type="color"
                                                    value={color}
                                                    onChange={(e) => handleColorChange(index, e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sticky Action Buttons */}
                    <div className="sticky bottom-20 sm:bottom-4 z-40">
                        <div className="flex justify-center gap-2 sm:gap-4 p-3 sm:p-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-xl border border-green-100 dark:border-zinc-800 shadow-lg">
                            <button onClick={reset} className="btn-secondary flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Start Over</span>
                                <span className="sm:hidden">Reset</span>
                            </button>
                            <button
                                onClick={downloadImage}
                                disabled={!convertedImage || isConverting}
                                className="btn-primary flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
                            >
                                <Download className="w-4 h-4" />
                                Download {currentFormat?.label}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}

export default FormatConverter
