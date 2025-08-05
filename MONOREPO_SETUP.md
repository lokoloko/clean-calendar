# Monorepo Setup Documentation

## Overview

The clean-calendar project has been restructured as a monorepo to support multiple applications sharing common UI components and utilities.

## Structure

```
clean-calendar/
├── apps/               # Future applications (analytics, etc.)
├── packages/          
│   └── ui/            # Shared UI component library
├── src/               # Main cleaning calendar app
├── package.json       # Root package with workspaces
└── turbo.json        # Turborepo configuration
```

## Shared UI Package (@gostudiom/ui)

### Location
`packages/ui/`

### Components
The shared UI package includes 40+ components:
- **Layout**: Card, Separator, Sheet, Tabs
- **Forms**: Input, Label, Select, Textarea, Checkbox, Form
- **Feedback**: Alert, Badge, Toast, Tooltip
- **Overlay**: Dialog, Dropdown Menu, Popover
- **Display**: Avatar, Badge, Skeleton, Table, ResponsiveTable
- **Actions**: Button
- **Data Viz**: Chart, Progress
- **Utilities**: cn() for class name merging

### Usage

1. Import components from the shared package:
```typescript
import { Button, Card, CardHeader, CardTitle } from '@gostudiom/ui'
```

2. Import styles in your app's global CSS:
```css
@import "@gostudiom/ui/styles/globals.css";
```

3. Extend the shared Tailwind config:
```typescript
import baseConfig from "@gostudiom/ui/tailwind.config"

export default {
  presets: [baseConfig],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@gostudiom/ui/src/**/*.{ts,tsx}",
  ],
}
```

## Scripts

### Root Level
- `npm install` - Install all dependencies
- `npm run dev` - Run main app in development
- `npm run build` - Build main app
- `npm run dev:turbo` - Run all apps with Turborepo
- `npm run build:turbo` - Build all apps with Turborepo
- `npm run lint:turbo` - Lint all apps
- `npm run typecheck:turbo` - Type check all apps

### UI Package Development
```bash
cd packages/ui
npm run build      # Build the package
npm run dev        # Watch for changes
npm run type-check # Type check
```

## Migration Notes

### Import Updates
All imports from `@/components/ui/*` have been automatically updated to `@gostudiom/ui`:

**Before:**
```typescript
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
```

**After:**
```typescript
import { Button, Card } from "@gostudiom/ui"
```

### Custom Hooks
The `use-toast` hook remains in the main app as it uses React context, but imports types from `@gostudiom/ui`.

## Next Steps

1. **Create Analytics App**:
   ```bash
   mkdir -p apps/analytics
   cd apps/analytics
   npm init next-app .
   ```

2. **Add to package.json**:
   ```json
   {
     "dependencies": {
       "@gostudiom/ui": "workspace:*"
     }
   }
   ```

3. **Configure Tailwind** to use the shared config

4. **Import styles** and start using shared components

## Benefits

1. **Consistency**: All apps use the same design system
2. **Efficiency**: Changes to components automatically propagate
3. **Type Safety**: Shared TypeScript definitions
4. **Performance**: Components are only built once
5. **Scalability**: Easy to add new apps to the monorepo

## Troubleshooting

### Module Resolution Issues
If you get "module not found" errors:
1. Run `npm install` from the root
2. Check that the UI package is listed in dependencies
3. Restart your dev server

### Type Errors
If TypeScript can't find types:
1. Check that `@gostudiom/ui` exports the component
2. Run `npm run typecheck` to verify
3. Restart TypeScript server in your IDE

### Style Issues
If styles aren't applied:
1. Ensure you've imported the globals.css
2. Check that Tailwind config includes the UI package path
3. Clear your build cache