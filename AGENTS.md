# PawPaint Development Guide

## Project Overview

PawPaint is a digital painting app designed specifically for cats. It features a paw-optimized interface that responds to gentle touches, swipes, and nose boops, allowing cats to create abstract art on touch devices.

**Live Site:** https://pawpaint.catcafe.space

## Key Features

- Touch-sensitive canvas optimized for paw interactions
- Human-controlled settings lock to prevent accidental changes
- Variable brush sizes for different touch types
- Cat-safe color palette
- Easy canvas reset functionality
- Tablet-friendly design

## Development Guidelines

### Setup
```bash
npm install
npm run dev
```

### Architecture
- Frontend-only application built for touch devices
- Optimized for tablets placed on stable surfaces
- Responsive design for various screen sizes

### Design Principles
- **Paw-First Design**: All interactions must work with cat paws, not just human fingers
- **Simplicity**: Minimal UI to avoid overwhelming cats
- **Safety**: No harmful colors or effects that could distress animals
- **Accessibility**: Large touch targets and clear visual feedback

### Development Best Practices
- Test on actual touch devices, preferably tablets
- Consider paw size variations (kittens vs large cats)
- Implement smooth, responsive touch handling
- Avoid small UI elements that require precision
- Use high contrast colors for visibility

### Deployment
The project is deployed to Cloudflare Pages with GitHub integration:
- Build command: `npm run build`
- Output directory: `dist`
- Custom domain: `pawpaint.catcafe.space`

### Testing
- Test with various touch pressures and sizes
- Verify performance on tablets and mobile devices
- Ensure canvas responds to light touches (toe beans)
- Test human controls remain accessible but protected
