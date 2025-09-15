#!/bin/bash

# Exit on any error
set -e

echo "Starting React + Vite frontend build process..."

# Install dependencies (including dev dependencies for build tools)
echo "Installing dependencies..."
npm ci

# Build the React application for production
echo "Building React application..."
npm run build

# Copy the built files to the output directory
echo "Copying built files to output directory..."

# Copy the main HTML file
cp dist/index.html /out/

# Copy all assets (JS, CSS, images, etc.)
cp -r dist/assets /out/

# Copy any other static files that might be in dist
if [ -d "dist" ]; then
    # Copy any additional files from dist that aren't assets
    find dist -maxdepth 1 -type f -not -name "index.html" -not -path "dist/assets/*" -exec cp {} /out/ \;
fi

# Ensure the output directory has proper permissions
chmod -R 755 /out/

echo "Frontend build completed successfully"
echo "Built files:"
echo "- index.html"
echo "- assets/ (JS, CSS, and other static files)"
echo "Build process completed for React + Vite frontend"
exit 0