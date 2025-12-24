import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { Upload, X } from 'lucide-react'

// =====================================================
// FILE UPLOAD COMPONENT
// This is a reusable component for uploading images and videos.
// It handles drag-and-drop, click to upload, and shows
// a preview of the uploaded file.
// =====================================================

const FileUpload = forwardRef(({ onFileSelect, acceptedTypes = 'image/*', maxSizeMB = 10, helpText = null }, ref) => {
  // State to track if user is dragging a file over the zone
  const [isDragging, setIsDragging] = useState(false)
  // State to store the selected file
  const [selectedFile, setSelectedFile] = useState(null)
  // State to store preview URL
  const [preview, setPreview] = useState(null)
  // State for error messages
  const [error, setError] = useState(null)

  // Reference to the hidden file input
  const fileInputRef = useRef(null)

  // Convert MB to bytes for validation
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // Check if file type is allowed based on acceptedTypes prop
  const isFileTypeAllowed = (file) => {
    const types = acceptedTypes.split(',').map(t => t.trim())
    return types.some(type => {
      if (type === 'image/*') return file.type.startsWith('image/')
      if (type === 'video/*') return file.type.startsWith('video/')
      return file.type === type
    })
  }

  // Check if file is a video
  const isVideo = (file) => file?.type.startsWith('video/')

  // Handle when a file is selected (either by drop or click)
  const handleFile = (file) => {
    setError(null)

    // Validate file type based on acceptedTypes prop
    if (!isFileTypeAllowed(file)) {
      const allowsVideo = acceptedTypes.includes('video')
      setError(allowsVideo ? 'Please upload an image or video file' : 'Please upload an image file')
      return
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB`)
      return
    }

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file)

    setSelectedFile(file)
    setPreview(previewUrl)

    // Call the parent's callback with the file
    if (onFileSelect) {
      onFileSelect(file)
    }
  }

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  // Handle click to upload
  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
  }

  // Clear the selected file
  const clearFile = () => {
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onFileSelect) {
      onFileSelect(null)
    }
  }

  // Expose reset method via ref
  useImperativeHandle(ref, () => ({
    reset: clearFile
  }))

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept={acceptedTypes}
        className="hidden"
      />

      {/* If no file is selected, show the upload zone */}
      {!selectedFile ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            upload-zone cursor-pointer
            border-2 border-dashed border-green-200 dark:border-zinc-700 rounded-2xl bg-white dark:bg-transparent
            p-6 sm:p-12 text-center
            ${isDragging ? 'dragging' : ''}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-zinc-800 flex items-center justify-center">
              <Upload className="w-8 h-8 text-accent-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-zinc-900 dark:text-zinc-200 font-medium mb-1">
                Drop your file here, or click to browse
              </p>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm">
                {helpText || `Supports JPG, PNG, WebP up to ${maxSizeMB}MB`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* If a file is selected, show the preview */
        <div className="card p-4">
          <div className="flex items-start gap-4">
            {/* Preview - Image or Video */}
            <div className="preview-container w-32 h-32 flex-shrink-0">
              {isVideo(selectedFile) ? (
                <video
                  src={preview}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-zinc-900 dark:text-zinc-200 font-medium truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-500 text-sm">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    {isVideo(selectedFile) && ' • Video'}
                  </p>
                </div>
                <button
                  onClick={clearFile}
                  className="p-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-green-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
})

FileUpload.displayName = 'FileUpload'

export default FileUpload
