# Format Converter - User & Developer Guide

## For Users

### Supported Formats

#### 📺 PNG (Recommended for graphics)
- **Type:** Lossless
- **Best for:** Graphics, screenshots, images with transparency
- **Size:** Moderate to large
- **Transparency:** ✅ Supported
- **Quality loss:** None
- **Use when:** You need perfect quality and transparency

#### 📷 JPEG (Recommended for photos)
- **Type:** Lossy compression
- **Best for:** Photographs, natural images
- **Size:** Small
- **Transparency:** ❌ Not supported (becomes white background)
- **Quality loss:** Adjustable via quality slider
- **Use when:** File size matters, transparency not needed

#### 📸 JPG (Alternative to JPEG)
- **Type:** Lossy compression
- **Best for:** Same as JPEG
- **Identical to:** JPEG format
- **Use when:** You prefer the .jpg file extension

#### ⚡ WebP (Best compression)
- **Type:** Modern lossy/lossless
- **Best for:** Web images, modern browsers
- **Size:** Smaller than JPEG
- **Transparency:** ✅ Supported
- **Quality loss:** Adjustable via quality slider
- **Use when:** Your audience uses modern browsers

#### 🎬 GIF (Best for simple graphics)
- **Type:** Indexed color (256 colors)
- **Best for:** Simple graphics, logos, memes
- **Size:** Varies (good for simple images)
- **Transparency:** ✅ Supported
- **Quality loss:** Always (color reduction)
- **Use when:** You need animation or simple graphics
- **Note:** Photos will look posterized (color banding)

#### ✨ SVG (Scalable vectors)
- **Type:** Vector graphics
- **Best for:** Logos, icons, simple graphics
- **Size:** Very small for simple shapes
- **Transparency:** ✅ Supported
- **Quality loss:** Possible detail loss
- **Use when:** You need scalable, resolution-independent graphics
- **⚠️ Warning:** Not suitable for photographs

---

## How to Use Each Format

### Converting to PNG
1. Upload your image
2. Click "PNG"
3. Download (no quality settings - always lossless)

### Converting to JPEG/JPG
1. Upload your image
2. Click "JPEG" or "JPG"
3. Adjust quality slider (higher = better quality, larger file)
4. Download

### Converting to WebP
1. Upload your image
2. Click "WebP"
3. Adjust quality slider if desired
4. Download (best for web use)

### Converting to GIF
1. Upload your image
2. Click "GIF"
3. Adjust **Frame Delay** (50ms = fast, 500ms = slow) for animation timing
4. Adjust **Quality** slider
5. Download
6. **Tip:** Best results with simple graphics, not photos

### Converting to SVG
1. Upload your image
2. Click "SVG"
3. Adjust **Colors** slider:
   - Lower = simpler output, faster
   - Higher = more detailed output, larger file
4. Download
5. **Important:** Use only for graphics/logos, not photos

---

## Quality Settings Explained

### Quality Slider (for JPEG, JPG, WebP)
- **Low (10%):** Smallest file, visible quality loss
- **Medium (50%):** Balanced file size and quality
- **High (90%):** Large file, nearly lossless
- **Slider range:** 10% to 100%

### GIF Frame Delay
- **Fast (50ms):** Quick animation/display
- **Medium (250ms):** Normal animation speed
- **Slow (500ms):** Slow animation/presentation
- **Use:** Only affects how fast a GIF "plays" if animated

### SVG Color Count
- **Low (2-4):** Simple logo-like output, very small file
- **Medium (8-12):** Balanced detail and file size
- **High (16):** Most detailed output, larger file
- **Use:** Higher numbers better for complex graphics

---

## Format Comparison Chart

| Aspect | PNG | JPEG | WebP | GIF | SVG |
|--------|-----|------|------|-----|-----|
| **File Size** | Medium | Small | Smaller | Varies | Tiny |
| **Quality** | Lossless | Lossy | Lossy | 256 colors | Vector |
| **Transparency** | Yes | No* | Yes | Yes | Yes |
| **Photos** | Good | Best | Best | Poor | No |
| **Graphics** | Good | OK | Good | Best | Best |
| **Animation** | No | No | No | Yes | No |
| **Scalability** | No | No | No | No | Yes |
| **Browser Support** | 100% | 100% | 95% | 100% | 100% |

*JPEG converts transparent areas to white background

---

## For Developers

### Component Structure

```
FormatConverter.jsx
├── State Management
│   ├── originalFile
│   ├── convertedImage
│   ├── targetFormat
│   ├── quality
│   ├── gifFrameDelay
│   ├── svgColorCount
│   └── isConverting
├── Conversion Functions
│   ├── convertToStandard() - Canvas API
│   ├── convertToGIF() - gif.js library
│   └── convertToSVG() - image-tracer-js
└── UI Components
    ├── Format Selection Grid
    ├── Format-specific Controls
    ├── Error Messages
    ├── Loading State
    ├── File Size Comparison
    └── Download Button
```

### Adding a New Format

#### Step 1: Add to formats array
```javascript
const formats = [
  {
    id: 'newformat',
    label: 'NewFormat',
    mime: 'image/newformat',
    description: 'Description here',
    icon: '🎨',
    warning: 'Optional warning message'
  }
]
```

#### Step 2: Create conversion function
```javascript
const convertToNewFormat = async (img) => {
  // Your conversion logic here
  return blob;
}
```

#### Step 3: Update main convertImage function
```javascript
if (targetFormat === 'newformat') {
  blob = await convertToNewFormat(img);
}
```

#### Step 4: Add format-specific controls (if needed)
```javascript
{targetFormat === 'newformat' && (
  <div>
    {/* Your control here */}
  </div>
)}
```

### Adding Dependencies

If adding a new library, install it first:
```bash
npm install library-name
```

Then import it:
```javascript
import LibraryName from 'library-name'
```

### Performance Tips

1. **Use Web Workers** for CPU-intensive operations (like GIF)
2. **Debounce** conversion on parameter changes
3. **Load large libraries from CDN** instead of bundling
4. **Show loading state** for slow operations
5. **Compress images** before conversion when possible

---

## Common Issues & Solutions

### My JPEG file is huge
- Lower the quality slider (50-70% is usually good)
- JPEGs are naturally larger for lossless content
- Try WebP instead (better compression)

### GIF looks bad / posterized
- GIF limited to 256 colors
- Better for simple graphics, not photos
- Convert graphics/logos as PNG instead

### SVG doesn't look right
- SVG works by detecting edges, not perfect
- Better for simple shapes and logos
- Not suitable for photographs
- Try increasing color count for more detail

### Download button doesn't work
- Check browser's download settings
- Try a different browser
- Clear browser cache
- Check if file size is reasonable

### Conversion is very slow
- GIF and SVG are slower than others
- Large images take longer
- Browser tab is in background? May slow down
- Try closing other heavy apps

---

## File Size Expectations

### PNG
- Small image (200x200): 10-30 KB
- Medium image (800x600): 50-200 KB
- Large image (2000x1500): 500KB-2MB

### JPEG (90% quality)
- Small image (200x200): 5-15 KB
- Medium image (800x600): 20-80 KB
- Large image (2000x1500): 200-500 KB

### WebP (90% quality)
- 20-30% smaller than JPEG equivalent

### GIF
- Small image: 5-20 KB
- Medium image: 20-100 KB
- Varies greatly based on color complexity

### SVG
- Simple logo: 1-10 KB
- Complex graphic: 20-100 KB
- Photo: 500KB+ (not recommended)

---

## Best Practices

1. **Use PNG for:** Screenshots, graphics with text, anything needing transparency
2. **Use JPEG for:** Photos, natural images, when file size matters
3. **Use WebP for:** Modern web applications, best compression
4. **Use GIF for:** Simple animations, graphics with limited colors
5. **Use SVG for:** Logos, icons, graphics that need to scale

---

## API Reference

### Main Component Props
- No props required (uses internal state)

### Available Formats
```javascript
['png', 'jpeg', 'jpg', 'webp', 'gif', 'svg']
```

### Quality Range
- `quality: 0.1 to 1.0` (10% to 100%)

### GIF Frame Delay Range
- `gifFrameDelay: 50 to 500` (milliseconds)

### SVG Color Count Range
- `svgColorCount: 2 to 16` (number of colors)

---

## External Resources

- [Image Formats Explained](https://www.adobe.com/creativecloud/file-types/image.html)
- [GIF.js Documentation](https://github.com/jnordberg/gif.js)
- [Image-Tracer.js Documentation](https://github.com/jankovicsandras/imagetracerjs)
- [Web Image Best Practices](https://developers.google.com/speed/webp)
