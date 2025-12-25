# 🐾 PawPaint

*Digital art for our feline overlords*

![Cat painting](https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif)

## What is PawPaint? 🎨

PawPaint is the purr-fect painting app designed specifically for cats! Watch your kitty create abstract masterpieces with every paw tap, swipe, and curious nose boop on the screen.

### ✨ Features

🐱 **Paw-Optimized Interface** - Responds to gentle paw taps and swipes  
🔒 **Human Controls** - Lock settings so cats can't accidentally break things  
📱 **Touch Sensitive** - Detects even the softest toe bean touches  
🌈 **Cat-Safe Colors** - Vibrant digital paints that won't make a mess  
🖌️ **Variable Brush Sizes** - From delicate whisker touches to full paw prints  
📱 **Tablet Ready** - Perfect for iPads placed on the floor  
🗑️ **Easy Reset** - Humans can clear the canvas between art sessions  

### 🚀 Quick Start

```bash
npm install
npm run dev
```

Place your device on a stable surface, and let your cat discover their inner artist!

### 🐾 Perfect For

- Cats who love batting at moving things on screens
- Pet parents who want to entertain their indoor cats
- Creating unique "paw-stract" art pieces
- Keeping curious cats busy while you work

### 🎯 Pro Tips

- Place device flat on a low table or floor
- Start with larger brush sizes for easier paw detection
- Take screenshots of your cat's masterpieces!
- Best enjoyed with treats nearby as motivation

---

*Made with ❤️ for our artistic feline friends*

---

## Deploy to Cloudflare Pages (GitHub Integration)

> **Important:** PawPaint relies on Cloudflare **Pages Functions** (`functions/` directory). Deploying it as a standalone Worker will skip these endpoints and break room sharing. Always deploy as a **Pages** project.

1. In Cloudflare Pages, create a new project from `https://github.com/andrewdkennedy1/PawPaint`.
2. Set build command to `npm run build` and build output directory to `dist`.
3. Confirm the project type is **Pages** (not Workers) so the Functions are uploaded.
4. Add the custom domain `pawpaint.catcafe.space` in Pages, then follow the DNS instructions.

For manual deployments, build locally then run:

```bash
npm run build
npx wrangler pages deploy dist --project-name pawpaint
```
