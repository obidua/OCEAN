#!/bin/bash
# This script creates PNG favicons from the SVG

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Installing via Homebrew..."
    brew install imagemagick
fi

# Create various sized PNG favicons from SVG
echo "Creating favicons from SVG..."

# Create 16x16
convert -background none -resize 16x16 favicon.svg favicon-16x16.png
echo "✓ Created favicon-16x16.png"

# Create 32x32
convert -background none -resize 32x32 favicon.svg favicon-32x32.png
echo "✓ Created favicon-32x32.png"

# Create 180x180 (Apple touch icon)
convert -background none -resize 180x180 favicon.svg apple-touch-icon.png
echo "✓ Created apple-touch-icon.png"

# Create 192x192 (Android)
convert -background none -resize 192x192 favicon.svg icon-192x192.png
echo "✓ Created icon-192x192.png"

# Create 512x512 (Android and PWA)
convert -background none -resize 512x512 favicon.svg icon-512x512.png
echo "✓ Created icon-512x512.png"

# Create favicon.ico with multiple sizes
convert favicon.svg -define icon:auto-resize=16,32,48 favicon.ico
echo "✓ Created favicon.ico"

echo ""
echo "✅ All favicons created successfully!"
echo ""
echo "Files created:"
ls -lh favicon*.png icon*.png apple-touch-icon.png favicon.ico 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'

