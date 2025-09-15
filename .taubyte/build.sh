#!/bin/bash

# Copy the test.html file to the output directory
cp test.html /out/index.html

# Create a simple directory structure for serving
mkdir -p /out/assets
echo "Frontend build completed successfully"
exit 0