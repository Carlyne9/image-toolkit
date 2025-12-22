# Image Toolkit - Project Context

## Project Overview

**Image Toolkit** is a modern, web-based image processing platform built with React and Vite. It provides three primary tools for image manipulation:
- **Background Remover** - Remove backgrounds from images via API
- **Watermark Remover** - Interactively paint and remove watermarks using OpenCV
- **Format Converter** - Convert images between PNG, JPEG, and WebP formats

The application is fully responsive, supports dark mode, and uses client-side processing where possible to ensure privacy.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18.2.0 |
| **Build Tool** | Vite 7.3.0 |
| **Styling** | Tailwind CSS 3.4.1 |
| **Icons** | Lucide React 0.263.1 |
| **Image Processing** | OpenCV.js 4.5.0 (via @techstark/opencv-js 4.12.0) |
| **PostCSS** | 8.4.35 (for Tailwind compilation) |
| **Node Version** | 18.x+ recommended |

---

## Project Structure

```
image-toolkit/
├── src/
│   ├── components/
│   │   ├── BackgroundRemover.jsx      # Background removal tool (API-based)
│   │   ├── WatermarkRemover.jsx       # Watermark removal tool (OpenCV inpainting)
│   │   ├── FormatConverter.jsx        # Image format conversion (client-side)
│   │   └── FileUpload.jsx             # Reusable file upload component
│   ├── App.jsx                        # Main app component (tab routing, theme)
│   ├── main.jsx                       # React entry point
│   └── index.css                      # Custom Tailwind styles and animations
├── index.html                         # HTML template (includes OpenCV script)
├── package.json                       # Dependencies and npm scripts
├── package-lock.json                  # Locked dependency versions
├── vite.config.js                     # Vite configuration
├── tailwind.config.js                 # Tailwind theme customization
├── postcss.config.js                  # PostCSS plugins for Tailwind
├── README.md                          # User-facing documentation
├── CONTEXT.md                         # This file
└── .env                               # Environment variables (not in repo)
```

---

## Component Architecture

### App.jsx (Main)
**Purpose:** Root component that manages:
- Tab navigation between tools
- Dark/light theme switching
- Layout and header/footer rendering

**Key State:**
- `activeTab` - Which tool is currently displayed ('background', 'watermark', 'converter')
- `theme` - Current theme ('light' or 'dark'), persisted to localStorage

**Key Features:**
- Theme persistence via localStorage
- Dynamic tab switching with smooth animations
- Responsive header with theme toggle button

---

### BackgroundRemover.jsx
**Purpose:** Remove backgrounds from images using an external API

**Processing Flow:**
1. User uploads image via FileUpload component
2. On button click, image is sent to API (remove.bg)
3. API returns image with transparent background
4. Result is displayed and can be downloaded

**Key State:**
- `originalFile` - The uploaded image file
- `processedImage` - Image URL after background removal
- `isProcessing` - Loading state during API call
- `error` - Error messages from API

**API Integration:**
- Uses environment variables: `VITE_REMOVE_BG_API_KEY` and `VITE_REMOVE_BG_API_URL`
- Expects a `.env` file with:
  ```
  VITE_REMOVE_BG_API_KEY=your_api_key_here
  VITE_REMOVE_BG_API_URL=https://api.remove.bg/v1.0/removebg
  ```
- Sends multipart FormData with image file
- Handles API errors with user-friendly messages

**Supported APIs:**
- remove.bg (default/recommended)
- Photoroom
- Clipdrop

---

### WatermarkRemover.jsx
**Purpose:** Interactively paint over and remove watermarks using OpenCV inpainting

**Processing Flow:**
1. User uploads image
2. Image loads onto HTML5 canvas
3. User draws on canvas to mask watermark area
4. OpenCV performs inpainting on masked region
5. Result is displayed and can be downloaded

**Key State:**
- `originalFile` - Uploaded image
- `originalImage` - Image object for redrawing
- `processedImage` - Result after inpainting
- `brushSize` - Current brush size (10-100px)
- `isDrawing` - Whether user is currently drawing
- `opencvReady` - Whether OpenCV.js has loaded

**Canvas Implementation:**
- **Main canvas** (`canvasRef`) - Display layer showing image + drawing overlay
- **Mask canvas** (`maskCanvasRef`) - Hidden canvas tracking white pixels = inpaint areas

**OpenCV Operations:**
1. `cv.imread()` - Read canvas to Mat
2. `cv.cvtColor()` - Convert mask to grayscale
3. `cv.threshold()` - Binarize mask (0 or 255 only)
4. `cv.inpaint()` - Apply TELEA algorithm for inpainting
5. `cv.imshow()` - Display result back to canvas

**OpenCV Initialization:**
- Script loaded asynchronously in `index.html`
- useEffect polls for `window.cv` readiness (every 100ms)
- Button disabled until ready

---

### FormatConverter.jsx
**Purpose:** Convert images between multiple formats with format-specific options

**Processing Flow:**
1. User uploads image
2. Selects target format from 6 available options
3. Format-specific settings appear (quality, colors, delay)
4. Image is converted using appropriate algorithm
5. Result is displayed with file size comparison
6. User can download result

**Key State:**
- `originalFile` - Uploaded image
- `convertedImage` - Image URL/blob after conversion
- `targetFormat` - Selected output format (png/jpeg/jpg/webp/gif/svg)
- `quality` - Quality slider (0.1-1.0, for JPEG/WebP/JPG)
- `gifFrameDelay` - GIF frame delay in milliseconds (50-500ms)
- `svgColorCount` - SVG color limit (2-16)
- `isConverting` - Loading state
- `error` - Conversion error message
- `originalSize` / `convertedSize` - File sizes in bytes

**Supported Formats:**

| Format | Type | MIME | Features | Best For |
|--------|------|------|----------|----------|
| PNG | Lossless | image/png | Transparency, full quality | Graphics, screenshots |
| JPEG | Lossy | image/jpeg | Compressed photos, no alpha | Photos, natural images |
| JPG | Lossy | image/jpeg | Same as JPEG (alternative name) | Photos, web |
| WebP | Modern | image/webp | Best compression, quality | Web images, modern browsers |
| GIF | Indexed | image/gif | 256 colors, animation support | Simple graphics, memes |
| SVG | Vector | image/svg+xml | Scalable, math-based | Logos, icons, graphics |

**Format-Specific Handling:**

**Canvas-based (PNG, JPEG, JPG, WebP):**
- Uses HTML5 Canvas API natively
- `canvas.toBlob()` with quality parameter
- JPEG/JPG: White background applied to transparent areas
- PNG: Lossless, quality slider hidden

**GIF Conversion:**
- Uses `gif.js` library (Web Worker-based)
- Converts image to 256-color indexed format
- `gifFrameDelay` parameter (50-500ms) for animation timing
- Quality slider maps to GIF encoding quality
- Worker script loaded from CDN (jsdelivr)
- Returns blob with `image/gif` MIME type

**SVG Conversion:**
- Uses `image-tracer-js` library loaded from CDN
- Converts raster to vector via image tracing
- `svgColorCount` parameter (2-16) controls color palette
- Performs edge detection and Potrace-like algorithm
- Returns SVG string as blob
- Not recommended for photos (quality loss)

**Auto-conversion:**
- useEffect watches `[originalFile, targetFormat, quality, gifFrameDelay, svgColorCount]`
- Converts automatically when any dependency changes
- Debounced 300ms to prevent rapid re-conversions
- Shows loading spinner during GIF/SVG processing

**Error Handling:**
- Displays user-friendly error messages
- Format-specific warnings (e.g., "GIF best for simple graphics")
- Graceful fallbacks for missing libraries

---

### FileUpload.jsx (Reusable)
**Purpose:** Shared component for file selection with drag-and-drop support

**Features:**
- Drag-and-drop zone
- Click to browse file dialog
- File type validation (images only)
- File size validation (default 10MB max)
- Preview thumbnail after selection
- Clear button to deselect file
- Error messages for invalid files

**Props:**
- `onFileSelect(file)` - Callback when file is selected
- `acceptedTypes` - MIME types to accept (default: 'image/*')
- `maxSizeMB` - Max file size in MB (default: 10)

**State:**
- `selectedFile` - File object
- `preview` - Data URL for preview image
- `isDragging` - Whether user is dragging over zone
- `error` - Validation error message

---

## Styling & Design

### Tailwind Configuration (tailwind.config.js)
**Custom Color Palette:**
- **Accent color** (green): Used for buttons, highlights, active states
  - Range from 50 (lightest) to 900 (darkest)
  - Primary: `#22c55e` (accent-500)

**Custom Fonts:**
- **Sans-serif:** DM Sans (body text, UI)
- **Monospace:** JetBrains Mono (numbers, file sizes)

**Custom Animations:**
- `fade-in` - Opacity fade over 0.5s
- `slide-up` - Slide up + fade over 0.5s
- `pulse-slow` - Slow 3s pulse animation

### Custom Styles (src/index.css)
**Component Classes:**
- `.btn-primary` - Green button with hover/active states
- `.btn-secondary` - Light button with border
- `.card` - Card container with backdrop blur and green tint
- `.tab` - Tab navigation styling with active state
- `.upload-zone` - Drag-and-drop zone with hover animation
- `.preview-container` - Checkered background pattern for transparency

**Dark Mode:**
- Uses `dark:` prefix throughout (Tailwind)
- Dark mode triggered by `dark` class on `<html>` element
- Theme preference saved to localStorage

---

## Configuration Files

### vite.config.js
- Basic Vite setup with React plugin
- SPA configuration
- Build output to `dist/`

### postcss.config.js
- PostCSS plugins: `tailwindcss` and `autoprefixer`
- Autoprefixes CSS for browser compatibility

### index.html
**Key Additions:**
- OpenCV.js script: `https://docs.opencv.org/4.5.0/opencv.js`
- Google Fonts link for DM Sans and JetBrains Mono
- Theme initialization script (prevents flash on page load)
- Entry point: `/src/main.jsx`

### .env (Not in repo)
**Required for Background Remover:**
```
VITE_REMOVE_BG_API_KEY=your_remove_bg_api_key
VITE_REMOVE_BG_API_URL=https://api.remove.bg/v1.0/removebg
```

---

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup
1. Create `.env` file in project root
2. Add API keys if using Background Remover:
   ```
   VITE_REMOVE_BG_API_KEY=your_api_key
   VITE_REMOVE_BG_API_URL=https://api.remove.bg/v1.0/removebg
   ```
3. Restart dev server to load environment variables

### Customization Points

**Colors:**
- Edit `tailwind.config.js` > `theme.extend.colors.accent`
- Primary color used throughout via `accent-500` class

**Fonts:**
- Change Google Fonts link in `index.html`
- Update `fontFamily` in `tailwind.config.js`

**Button Styles:**
- Edit `.btn-primary` and `.btn-secondary` in `src/index.css`

**Canvas Defaults:**
- Max dimensions in WatermarkRemover: lines 58-59
- Brush size range: lines 312-315 (10-100px)

---

## Data Flow Diagrams

### Background Remover Flow
```
User Upload (FileUpload)
        ↓
Display file preview
        ↓
User clicks "Remove Background"
        ↓
FormData + API key → API endpoint
        ↓
API processes and returns image blob
        ↓
Display result image
        ↓
User can download or start over
```

### Watermark Remover Flow
```
User Upload (FileUpload)
        ↓
Image loads to canvas + mask canvas
        ↓
User draws on canvas (mouse events)
        ↓
Draw white pixels to mask canvas
        ↓
User clicks "Remove Watermark"
        ↓
OpenCV reads canvas and mask
        ↓
cv.inpaint() with TELEA algorithm
        ↓
Display result on canvas
        ↓
User can download or start over
```

### Format Converter Flow
```
User Upload (FileUpload)
        ↓
Display conversion options
        ↓
User selects format + quality
        ↓
Auto-convert via Canvas API
        ↓
Display result + file size comparison
        ↓
User can download or convert again
```

---

## Performance Considerations

### Canvas Operations
- **WatermarkRemover:** 
  - Canvas size capped at 800x600 to avoid memory issues
  - Separate canvases for display and mask tracking
  - OpenCV operations are CPU-intensive; button disabled during processing

- **FormatConverter:**
  - Canvas size matches image dimensions
  - Quality slider has 0.05 step increments (reduces re-renders)
  - Blob creation is async to prevent UI blocking

### Image Loading
- Uses `URL.createObjectURL()` for in-memory image handling
- Revokes object URLs after use to free memory (FormatConverter)
- FileUpload validates size before processing

### OpenCV.js
- ~8MB library loaded async in `index.html`
- Initialization polling (100ms intervals) until ready
- Proper cleanup: `.delete()` called on all Mat objects

---

## Browser Compatibility

**Requires:**
- Canvas API (2D context)
- FileReader API
- Blob API
- CSS Grid & Flexbox
- CSS Custom Properties (for dark mode)
- ES2020+ JavaScript features

**Tested on:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Not supported:**
- IE11 (no Canvas, no ES6)
- Mobile browsers with limited memory (large images may fail)

---

## Known Limitations & Future Improvements

### Current Limitations
1. **Background Remover** - Requires API key (costs money beyond free tier)
2. **Watermark Remover** - Manual masking required (not automatic detection)
3. **Canvas size** - Capped at 800x600 to manage memory
4. **OpenCV** - Only TELEA inpainting algorithm (no Navier-Stokes)
5. **Mobile** - Touch input not yet implemented for drawing

### Potential Improvements

#### High Priority
- [ ] Add touch/stylus support to WatermarkRemover
- [ ] Implement automatic watermark detection (see backlog below)
- [ ] Fix manual masking drawing on canvas (currently working but could improve brush rendering)
- [ ] Implement undo/redo for drawing mask

#### Medium Priority
- [ ] Add batch processing for multiple images
- [ ] Add image cropping/resize tool
- [ ] Implement mask preview toggle (show/hide brush marks)
- [ ] Add adjustable inpaint radius parameter

#### Low Priority
- [ ] Support for animated GIFs
- [ ] Server-side processing for better quality
- [ ] Image history/recent files
- [ ] Pre-built mask templates (circular, rectangular, free-form)

---

## Watermark Removal Enhancement Backlog

### Context: Why Full Automation Is Difficult

OpenCV.js alone **cannot automatically detect watermarks** because:
- Traditional CV is great for image processing but poor at understanding *semantic objects*
- Cannot distinguish watermarks from other image content
- No "watermark recognition" capability without machine learning

### Option A: Hybrid OpenCV + Heuristics (Recommended First Step)
**Approach:** Auto-detect suspicious regions, let user refine

**Detection methods:**
1. **Edge Detection** - Find borders and text-like structures
   - Apply Canny edge detection
   - Find contours with high curvature/sharpness
   
2. **Color Clustering** - Isolate non-natural colors
   - K-means clustering to separate watermark colors from photo
   - Watermarks often have uniform, artificial colors
   
3. **Text Detection** - Find text regions (many watermarks are text)
   - Use Tesseract.js (OCR) to locate text
   - Mark those regions as potential watermarks
   
4. **Corner Detection** - Find geometric shapes
   - Harris corner detection for logos/shapes
   - Morphological operations to clean up
   
5. **Morphological Operations** - Clean detected regions
   - Dilate to expand regions
   - Erode to smooth edges

**Feasibility:** 60-80% success on simple watermarks (white text, logos)
**Limitations:** Fails on realistic/blended watermarks, complex graphics
**Cost:** Free, client-side only

**Implementation notes:**
```javascript
// Pseudo-code for hybrid detection
function autoDetectWatermark(image) {
  // 1. Convert to grayscale and apply edge detection
  const edges = cv.Canny(image, 50, 150);
  
  // 2. Find contours and filter by area/shape
  const contours = cv.findContours(edges);
  const watermarkCandidates = contours.filter(isWatermarkLike);
  
  // 3. Morphological closing to connect nearby regions
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
  const mask = new cv.Mat();
  cv.morphologyEx(binaryMask, mask, cv.MORPH_CLOSE, kernel);
  
  // 4. Return mask for user to review/refine
  return mask;
}
```

**Recommendation:** Implement this first - gives users a 70% time saving vs full manual brushing

---

### Option B: Deep Learning Detection (Higher Quality)
**Approach:** Use ML model in browser to detect watermarks

**Technologies:**
- **TensorFlow.js** - Run models in browser (~100-200MB models)
- **ONNX Runtime** - Lightweight inference engine
- **Hugging Face Transformers.js** - Pre-trained models with smaller footprint

**Possible models:**
1. **YOLOv8** - Object detection (detect watermark bounding boxes)
   - Size: ~50MB
   - Speed: Real-time on modern devices
   - Accuracy: 85-95% for trained watermark models
   
2. **Semantic Segmentation** - Pixel-level watermark detection
   - Models: Deeplab, SegFormer
   - Size: 80-150MB
   - Accuracy: 90%+ pixel precision
   
3. **Watermark-Specific Models** - Custom trained on watermark data
   - Size: 20-50MB (quantized)
   - Accuracy: 95%+ if trained well
   - Source: huggingface.co, tensorflow.org

**Feasibility:** 85-95% success rate
**Trade-offs:** 
- ✅ High accuracy
- ❌ 50-200MB model download (slow first load)
- ❌ Slower inference on older devices
- ❌ Complex implementation

**Implementation outline:**
```javascript
// Load TensorFlow model
const model = await tf.loadGraphModel('path/to/watermark-detection-model');

// Run inference
const predictions = model.predict(imageTensor);

// Convert predictions to OpenCV mask
const mask = convertPredictionsToMask(predictions);

// Use with existing inpaint pipeline
```

---

### Option C: Third-Party API Integration (Highest Quality)
**Approach:** Send image to cloud API for detection

**Recommended services:**

| Service | Algorithm | Cost | Quality | Speed |
|---------|-----------|------|---------|-------|
| **Picsart API** | Proprietary ML | $0.10-0.50 | Excellent | 2-5s |
| **Cleanup.pictures API** | Diffusion model | $0.02-0.05 | Very good | 3-10s |
| **Replicate (LaMa)** | Inpainting | $0.005 | Excellent | 5-15s |
| **AWS Rekognition** | Custom Labels | Variable | Very good | 1-3s |

**Pros:**
- ✅ State-of-art results (95%+)
- ✅ No client-side processing burden
- ✅ Can handle complex watermarks
- ✅ Automatic detection + removal in one call

**Cons:**
- ❌ Costs money per image ($0.005-0.50)
- ❌ Requires API key
- ❌ Network latency (1-15s)
- ❌ Privacy concern (images sent to cloud)

**Recommended:** Replicate's LaMa model (best value, $0.005/image)

---

### Recommended Implementation Path

**Phase 1 (Next Sprint):**
- Implement Option A (Hybrid OpenCV + Heuristics)
- Gives 70% automation with zero cost
- Users refine with brush for edge cases
- Update UI to show detected regions

**Phase 2 (If resources available):**
- Add Option B (TensorFlow.js) as a toggle
- "Use AI detection" checkbox on component
- Falls back to manual if model loads fail

**Phase 3 (If monetizing):**
- Integrate Option C (Replicate API)
- Offer as "Premium AI" feature
- Free tier uses manual/heuristic detection

---

### Expected User Experience After Implementation

**Current workflow:**
```
Upload → Draw mask (5 minutes) → Remove watermark → Download
```

**After Phase 1:**
```
Upload → [AUTO-DETECT] → Quick review (30 seconds) → Remove watermark → Download
```

**After Phase 3:**
```
Upload → [AI DETECTION] → Automatic removal → Download (30 seconds)
```

---

## File Size Reference

| File | Size | Purpose |
|------|------|---------|
| OpenCV.js | ~8MB | Loaded async in `<script>` tag |
| node_modules/ | ~500MB+ | Dependencies (not deployed) |
| dist/ (built) | ~100KB+ | Production bundle |

---

## Troubleshooting

### OpenCV not loading
- Check browser console (F12) for script load errors
- Verify internet connection (external CDN)
- Clear browser cache and reload
- Check if content-security-policy blocks external scripts

### API errors in Background Remover
- Verify API key in `.env` file
- Check API rate limits (free tier = limited requests)
- Ensure API URL is correct
- Check browser console for detailed error messages

### Canvas memory errors
- Reduce image size or canvas dimensions
- Close other browser tabs to free memory
- Reload page to clear memory

### Dark mode not persisting
- Check if localStorage is enabled
- Verify browser allows localStorage
- Check browser console for permission errors

---

## Deployment

### Build for Production
```bash
npm run build
```
Creates optimized build in `dist/` folder.

### Deploy To
- **Vercel** (recommended for Next.js, but works with Vite SPA)
- **Netlify** (drag-and-drop `dist` folder)
- **GitHub Pages** (with `.nojekyll` file)
- **Traditional hosting** (upload `dist` contents to web server)

### Environment Variables for Deployment
- Set `VITE_REMOVE_BG_API_KEY` and `VITE_REMOVE_BG_API_URL` in hosting platform's env settings
- Vite automatically injects at build time

---

## References & Resources

### Documentation
- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenCV.js Docs](https://docs.opencv.org/4.5.0/)
- [Lucide Icons](https://lucide.dev/)

### APIs
- [remove.bg API](https://www.remove.bg/api)
- [Canvas API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [FileReader API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)

---

## License & Attribution

- React: MIT License
- Vite: MIT License
- Tailwind CSS: MIT License
- OpenCV.js: BSD-3-Clause License
- Lucide Icons: ISC License
