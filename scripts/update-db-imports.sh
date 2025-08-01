#!/bin/bash

# Script to update db imports from pg-based to edge-compatible version

echo "Updating db imports in API routes..."

# Find all TypeScript files in the API directory
find src/app/api -name "*.ts" -type f | while read file; do
  # Skip test files
  if [[ $file == *"__tests__"* ]]; then
    continue
  fi
  
  # Check if file contains the old import
  if grep -q "from '@/lib/db'" "$file"; then
    echo "Updating: $file"
    # Replace the import
    sed -i '' "s|from '@/lib/db'|from '@/lib/db-edge'|g" "$file"
  fi
done

echo "Update complete!"