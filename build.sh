#!/bin/bash

# Create dist directory if it doesn't exist
mkdir -p dist

# Compile TypeScript files
npx tsc

# Copy HTML, CSS, and other assets
cp src/*.html dist/
cp src/*.css dist/
cp -r assets dist/

echo "Build completed!" 