#!/bin/bash

# Copy all frontend files to the output directory
cp index.html /out/
cp styles.css /out/
cp script.js /out/

# Create assets directory for any additional resources
mkdir -p /out/assets

echo "Frontend build completed successfully"
echo "Files copied: index.html, styles.css, script.js"
exit 0