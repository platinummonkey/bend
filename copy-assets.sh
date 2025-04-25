#!/bin/bash

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy HTML, CSS, and other assets
cp src/*.html dist/
cp src/*.css dist/
cp -r assets dist/
