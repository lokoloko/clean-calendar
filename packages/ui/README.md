# @gostudiom/ui

Shared UI component library for GoStudioM applications.

## Overview

This package contains reusable React components built with:
- Radix UI primitives for accessibility
- Tailwind CSS for styling
- TypeScript for type safety
- shadcn/ui component patterns

## Installation

```bash
npm install @gostudiom/ui
```

## Usage

### 1. Import styles in your app

Add to your main CSS file:
```css
@import "@gostudiom/ui/styles/globals.css";
```

### 2. Configure Tailwind

Extend your `tailwind.config.ts`:
```ts
import baseConfig from "@gostudiom/ui/tailwind.config"

export default {
  presets: [baseConfig],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@gostudiom/ui/src/**/*.{ts,tsx}",
  ],
  // Your app-specific config
}
```

### 3. Use components

```tsx
import { Button, Card, CardHeader, CardTitle } from '@gostudiom/ui'

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hello from shared UI!</CardTitle>
      </CardHeader>
      <Button>Click me</Button>
    </Card>
  )
}
```

## Available Components

- **Layout**: Card, Separator, Sheet, Tabs
- **Forms**: Input, Label, Select, Textarea, Checkbox, Form
- **Feedback**: Alert, Badge, Toast, Tooltip
- **Overlay**: Dialog, Dropdown Menu, Popover
- **Display**: Avatar, Badge, Skeleton, Table
- **Actions**: Button

## Development

```bash
# Build the package
npm run build

# Watch for changes
npm run dev

# Type check
npm run type-check
```

## Design System

### Colors
- Primary: Teal (173 80% 40%)
- Secondary: Light gray
- Accent: Blue (199 89% 48%)
- Destructive: Red
- Background/Foreground: Adaptive light/dark

### Typography
- Font: Inter (UI) / Space Grotesk (headings)
- Base size: 16px
- Line height: 1.5

### Spacing
- Base unit: 0.25rem (4px)
- Common scales: 2, 3, 4, 6, 8, 12, 16

### Border Radius
- sm: calc(0.5rem - 4px)
- md: calc(0.5rem - 2px)
- lg: 0.5rem

## Contributing

When adding new components:
1. Follow existing patterns
2. Ensure accessibility with Radix UI
3. Add TypeScript types
4. Export from index.ts
5. Document usage