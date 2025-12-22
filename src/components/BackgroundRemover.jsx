import { useState } from 'react'
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
  // The processed image (background removed)
  const [processedImage, setProcessedImage] = useState(null)
  // Loading state while API is processing
  const [isProcessing, setIsProcessing] = useState(false)
  // Error state
  const [error, setError] = useState(null)

  // Called when user uploads a file
  const handleFileSelect = (file) => {
    setOriginalFile(file)
    setProcessedImage(null)
    setError(null)
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
        // Try to get more detailed error message from the API
        let errorMessage = 'Failed to remove background'
        try {
          const errorData = await response.json()
          errorMessage = errorData.errors?.[0]?.title || errorData.error?.message || `Error ${response.status}: ${response.statusText}`
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
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
    setProcessedImage(null)
    setError(null)
  }

  return (
    <div className="card p-8">
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

      {/* Result Section */}
      {processedImage && (
        <div className="mt-8 space-y-6">
          {/* Preview */}
          <div className="preview-container aspect-video flex items-center justify-center p-4">
            <img
              src={processedImage}
              alt="Processed"
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button onClick={reset} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Start Over
            </button>
            <button onClick={downloadImage} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PNG
            </button>
          </div>
        </div>
      )}

      {/* Instructions when no file is uploaded */}
      {!originalFile && (
        <div className="mt-8 text-center text-zinc-600 dark:text-zinc-500 text-sm">
          <p>Upload an image to remove its background.</p>
          <p className="mt-1">Works best with photos of people, products, or objects.</p>
        </div>
      )}
    </div>
  )
}

export default BackgroundRemover
