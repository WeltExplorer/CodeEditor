#!/bin/bash
# Script to download and install Monaco Editor for MediaWiki CodeEditor extension

# Configuration
MONACO_VERSION="0.46.0"
TARGET_DIR="$(dirname "$0")"
TEMP_DIR=$(mktemp -d)

echo "Downloading Monaco Editor v${MONACO_VERSION}..."
curl -L "https://registry.npmjs.org/monaco-editor/-/monaco-editor-${MONACO_VERSION}.tgz" -o "${TEMP_DIR}/monaco-editor.tgz"

echo "Extracting..."
tar -xzf "${TEMP_DIR}/monaco-editor.tgz" -C "${TEMP_DIR}"

echo "Installing..."
# Create min directory if it doesn't exist
mkdir -p "${TARGET_DIR}/min"
# Copy the vs directory 
cp -r "${TEMP_DIR}/package/min/vs" "${TARGET_DIR}/min/"

echo "Cleaning up..."
rm -rf "${TEMP_DIR}"

echo "Monaco Editor v${MONACO_VERSION} installed successfully at ${TARGET_DIR}/min"
echo "Make sure to check and update any paths in monaco-init.js if needed."