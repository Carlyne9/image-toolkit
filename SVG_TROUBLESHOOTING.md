# SVG Conversion Troubleshooting Guide

## Common Errors and Solutions

### Error: `net::ERR_NAME_NOT_RESOLVED`
**Full error:** `GET https://cdn.jsdelivr.net/npm/image-tracer-js@1.2.6/imagetracer.min.js net::ERR_NAME_NOT_RESOLVED`

**Cause:** 
- Network connectivity issue
- DNS resolution failure
- Offline mode
- CDN temporarily unavailable
- Firewall/proxy blocking CDN

**Solutions:**
1. **Check internet connection**
   ```bash
   ping google.com
   # If no response, restart WiFi/network
   ```

2. **Clear browser cache**
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "All time" and check "Cache"
   - Click "Clear data"

3. **Try a different CDN** (fallback to local package)
   - App now tries locally installed `@image-tracer-ts/core` first
   - Only uses CDN if local not available
   - Local version is faster and doesn't require internet

4. **Check firewall/proxy**
   - Whitelist `cdn.jsdelivr.net` in firewall
   - Check corporate proxy settings
   - Try with VPN disabled

5. **Verify CDN availability**
   - Open in browser: https://cdn.jsdelivr.net/npm/image-tracer-js@1.2.6/imagetracer.min.js
   - Should download a JavaScript file
   - If shows error page, CDN is down

### Error: `ImageTracer failed: Error: Failed to load ImageTracer`

**Cause:**
- CDN unreachable (see above)
- CORS policy blocking the script
- Content Security Policy restrictions

**Solutions:**
1. **For CORS issues:**
   - Local package bypass this (now preferred method)
   - Check browser console for specific CORS error
   - May need server configuration change

2. **For CSP issues:**
   - Check if `Content-Security-Policy` header blocks CDN
   - Add CDN to CSP: `script-src https://cdn.jsdelivr.net`

3. **Verify local package is installed:**
   ```bash
   npm list @image-tracer-ts/core
   # Should show version number, not "npm ERR!"
   ```

### Error: `Conversion error: Error: Vector tracing unavailable`

**Cause:**
- Both local package and CDN failed to load
- Incompatible browser version
- Module loading issue

**Solutions:**
1. **Reinstall the package:**
   ```bash
   npm install @image-tracer-ts/core@latest
   npm run build
   ```

2. **Check browser compatibility:**
   - Chrome/Edge 90+
   - Firefox 88+
   - Safari 14+
   - IE11 not supported

3. **Clear npm cache:**
   ```bash
   npm cache clean --force
   npm install
   npm run build
   ```

### Error: `SVG contains embedded image, not true vector`

**Cause:**
- ImageTracer library not working correctly
- Malformed image input
- Timeout during tracing

**Solutions:**
1. **Try with a simpler image:**
   - Use solid color logo
   - High contrast image
   - Smaller file (< 500KB)

2. **Reduce color count:**
   - Move slider to 2-4 colors
   - Simpler images trace better

3. **Check image format:**
   - Ensure PNG/JPG/GIF uploaded
   - Avoid BMP, TIFF, or other formats
   - Test with a known-good image

4. **Increase browser memory:**
   - Close other browser tabs
   - Close other applications
   - Reload page
   - Try in incognito/private mode

### Error: `Failed to create SVG blob`

**Cause:**
- SVG string is invalid
- Memory issues
- Browser limitations

**Solutions:**
1. **Reduce image size:**
   ```bash
   # Resize image to < 2000x2000 pixels before uploading
   # Use image editor like Photoshop or GIMP
   ```

2. **Lower color count:**
   - Reduces SVG output size
   - Simpler paths easier to process

3. **Restart browser:**
   - Clear memory
   - Start fresh conversion

### Error: `Image tracing failed`

**Cause:**
- ImageTracer algorithm error
- Unsupported image format
- Corrupted image data

**Solutions:**
1. **Use different image format:**
   - Try PNG instead of JPG
   - Try JPG instead of PNG
   - Re-export from source editor

2. **Increase max iterations:**
   - Currently set to 10
   - Can increase to 20 for complex images
   - Takes longer but better results

3. **Test with reference image:**
   - Download sample logo from internet
   - Try converting that
   - If it works, issue with your image
   - If it fails, issue with setup

## Diagnostic Steps

### Step 1: Check Library Load
Open browser console (F12) and run:
```javascript
// Check if local package is loaded
console.log('ImageTracer available:', typeof window.ImageTracer)
console.log('ImageTracerLib available:', !!window.ImageTracerLib)
console.log('imageToSVG function:', typeof window.ImageTracer?.imageToSVG)
```

Expected output:
```
ImageTracer available: object
ImageTracerLib available: true
imageToSVG function: function
```

### Step 2: Check Network
In browser DevTools → Network tab:
1. Try SVG conversion
2. Look for requests to `cdn.jsdelivr.net`
3. Check if request succeeds or fails
4. If fails, note the error code

### Step 3: Check File Upload
```javascript
// In console, after uploading file
console.log('File loaded:', !!originalFile)
console.log('File type:', originalFile?.type)
console.log('File name:', originalFile?.name)
console.log('File size:', originalFile?.size)
```

### Step 4: Test Simple Conversion
1. Create 100x100px PNG with 2 solid colors
2. Upload to converter
3. Try SVG with color count = 2
4. Check if conversion succeeds
5. If yes, issue is with complex images
6. If no, issue is with setup

## Working Around CDN Failure

If CDN is permanently unavailable:

### Option 1: Use Local Package Only (Current Setup)
- Already configured as primary method
- Uses installed `@image-tracer-ts/core`
- No internet required
- Faster performance

To verify local is being used:
```bash
npm install @image-tracer-ts/core@latest
npm run build
npm run dev
# Try SVG conversion and check console for "Using locally installed ImageTracer"
```

### Option 2: Host CDN File Locally
If local package fails and you need CDN:

1. Download library:
   ```bash
   curl -o public/imagetracer.min.js \
     https://cdn.jsdelivr.net/npm/image-tracer-js@1.2.6/imagetracer.min.js
   ```

2. Update component to use local:
   ```javascript
   script.src = '/imagetracer.min.js'  // Instead of CDN URL
   ```

3. Rebuild and test

### Option 3: Use Alternative Library
Other vectorization options:
- **Potrace.js** - Dedicated tracing library
- **AutoTrace** - Professional vectorization
- **Vtracer** - Rust-based vector tracer

## Performance Tips

### For Faster SVG Conversion:
1. **Reduce image size** (< 1000x1000 px)
2. **Reduce color count** (2-4 colors)
3. **Use PNG format** (faster than JPG)
4. **Close browser tabs** (frees memory)
5. **Disable browser extensions** (can slow down)

### For Better Quality:
1. **Pre-process image:**
   - Increase contrast in Photoshop/GIMP
   - Reduce noise
   - Simplify color palette
   - Fill small gaps

2. **Adjust parameters:**
   - Increase `numberofcolors` to 12-16
   - Reduce `blurdelta` for crisp edges
   - Increase `maxiterations` to 20

## Testing Checklist

- [ ] Browser has internet connection
- [ ] CDN is accessible (test in browser)
- [ ] Local package installed (`npm list @image-tracer-ts/core`)
- [ ] App rebuilt (`npm run build`)
- [ ] Browser cache cleared
- [ ] Console shows no errors
- [ ] Test image loads correctly
- [ ] Conversion starts and completes
- [ ] Downloaded SVG contains `<path>` elements
- [ ] Downloaded SVG does NOT contain `<image>` tags

## Getting Help

When reporting issues, include:
1. Browser and version (Chrome 90, Firefox 88, etc.)
2. Operating system (Windows 10, macOS 12, etc.)
3. Exact error message from console
4. Steps to reproduce
5. Sample image file (if possible)
6. Output of `npm list @image-tracer-ts/core`
7. Network conditions (online/offline, VPN/proxy)

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| CDN not loading | Check internet, clear cache, restart browser |
| ImageTracer not found | `npm install`, `npm run build` |
| Slow conversion | Reduce image size, lower colors |
| Large SVG file | Reduce colors, simplify image |
| Poor quality | Increase colors, pre-process image |
| Memory error | Close browser tabs, reduce image size |
| Not scalable | Verify no `<image>` tags in SVG |

## Resources

- [ImageTracer JS GitHub](https://github.com/jankovicsandras/imagetracerjs)
- [Potrace Algorithm](http://potrace.sourceforge.net/)
- [SVG Specification](https://www.w3.org/TR/SVG2/)
- [Browser Console Help](https://developer.chrome.com/docs/devtools/console/)
