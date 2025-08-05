#!/bin/bash

# Core UI components to copy
COMPONENTS=(
  "button"
  "card"
  "dialog"
  "dropdown-menu"
  "input"
  "label"
  "select"
  "separator"
  "sheet"
  "table"
  "tabs"
  "textarea"
  "toast"
  "toaster"
  "badge"
  "alert"
  "form"
  "checkbox"
  "popover"
  "tooltip"
  "avatar"
  "scroll-area"
  "skeleton"
)

# Source and destination directories
SRC_DIR="src/components/ui"
DEST_DIR="packages/ui/src/components"

# Copy each component
for component in "${COMPONENTS[@]}"; do
  if [ -f "$SRC_DIR/$component.tsx" ]; then
    cp "$SRC_DIR/$component.tsx" "$DEST_DIR/$component.tsx"
    echo "Copied $component.tsx"
  else
    echo "Warning: $component.tsx not found"
  fi
done

echo "Components copied successfully!"