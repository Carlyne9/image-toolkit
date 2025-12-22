# 🖼️ Image Toolkit

A web-based image processing platform with three tools:
- **Background Remover** - Remove backgrounds from images
- **Watermark Remover** - Paint over and remove watermarks
- **Format Converter** - Convert between image formats (PNG, JPEG, WebP)

---

## 🚀 Quick Start (For Beginners)

### Step 1: Install Node.js

Before anything else, you need Node.js installed on your computer.

1. Go to [nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the green button)
3. Run the installer and follow the prompts
4. Restart your computer after installation

To verify it worked, open Terminal (Mac) or Command Prompt (Windows) and type:
```bash
node --version
```
You should see something like `v20.11.0`

### Step 2: Download and Open This Project

1. Download this entire `image-toolkit` folder to your computer
2. Open Terminal/Command Prompt
3. Navigate to the folder. For example:
   ```bash
   cd Downloads/image-toolkit
   ```

### Step 3: Install Dependencies

Run this command to install all the required packages:
```bash
npm install
```
This will take a minute. You'll see a progress bar and some output.

### Step 4: Start the Development Server

```bash
npm run dev
```

You should see output like:
```
  VITE v5.1.4  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 5: Open in Browser

Open your web browser and go to: **http://localhost:5173**

🎉 You should see the Image Toolkit running!

---

## 📁 Project Structure

```
image-toolkit/
├── src/
│   ├── components/
│   │   ├── FileUpload.jsx       # Reusable upload component
│   │   ├── BackgroundRemover.jsx # Background removal tool
│   │   ├── WatermarkRemover.jsx  # Watermark removal tool
│   │   └── FormatConverter.jsx   # Format conversion tool
│   ├── App.jsx                   # Main app with navigation
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Styles
├── index.html                    # HTML template
├── package.json                  # Dependencies
└── README.md                     # This file
```

---

## 🔌 Adding Real API Integration

### Background Remover (remove.bg)

1. Go to [remove.bg](https://www.remove.bg/api) and create a free account
2. Get your API key from the dashboard
3. Open `src/components/BackgroundRemover.jsx`
4. Find the commented-out API code (around line 40)
5. Uncomment it and replace `YOUR_API_KEY_HERE` with your actual key
6. Delete or comment out the placeholder code below it

### Watermark Remover

For proper watermark removal, you'll need an inpainting API:
- [Picsart API](https://picsart.com/api)
- [Stability AI](https://stability.ai/api)
- [Replicate](https://replicate.com) (run LaMa model)

The current implementation uses a simple blur as a placeholder.

### Format Converter

✅ This tool works completely client-side! No API needed.

---

## 🎨 Customizing the Design

### Colors
Open `tailwind.config.js` and modify the `accent` color palette.
The current theme uses green (`#22c55e`). Try:
- Blue: Change to Tailwind's `blue` colors
- Purple: Change to Tailwind's `purple` colors
- Orange: Change to Tailwind's `orange` colors

### Fonts
The app uses:
- **DM Sans** for body text
- **JetBrains Mono** for code/numbers

To change fonts:
1. Go to [Google Fonts](https://fonts.google.com)
2. Pick new fonts
3. Update the `<link>` tag in `index.html`
4. Update `fontFamily` in `tailwind.config.js`

### Styles
All custom styles are in `src/index.css`. The classes like `.btn-primary`, `.card`, and `.upload-zone` can be modified there.

---

## 🐛 Troubleshooting

### "npm: command not found"
Node.js isn't installed properly. Restart your computer and try again, or reinstall Node.js.

### "Port 5173 is in use"
Another app is using that port. Either close it, or run:
```bash
npm run dev -- --port 3000
```

### Images not processing
If using the Background Remover with a real API:
- Check your API key is correct
- Check you haven't exceeded the free tier limit
- Check the browser console (F12) for error messages

### Styles look broken
Clear your browser cache and refresh, or try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R).

---

## 🚢 Deploying to the Internet

When you're ready to share your project:

### Option 1: Vercel (Recommended - Free)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click "Import Project" and select your repo
5. Click "Deploy"

### Option 2: Netlify (Also Free)
1. Run `npm run build` to create production files
2. Go to [netlify.com](https://netlify.com)
3. Drag the `dist` folder to their deploy area

---

## 📚 Learning Resources

If you're new to React and web development:
- [React Official Tutorial](https://react.dev/learn)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

---

## 🆘 Need Help?

If you get stuck:
1. Copy the error message
2. Ask Claude (or your preferred AI assistant) to help debug
3. Paste the error and describe what you were trying to do

Good luck with your project! 🚀
