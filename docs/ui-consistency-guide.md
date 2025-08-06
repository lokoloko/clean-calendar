# UI Consistency Guide - Match Calendar App Styling

## 🚨 CRITICAL: Use Existing UI Components

### DO NOT CREATE NEW UI COMPONENTS FROM SCRATCH

The monorepo already has shared UI components in `packages/ui/`. You MUST:

1. **First check** what components exist in `packages/ui/`
2. **Import and use** those components
3. **Match the calendar's design patterns** exactly
4. **Only create analytics-specific components** that don't exist

### Step 1: Investigate Existing UI

```bash
# From monorepo root, check what's available:
ls -la packages/ui/
ls -la packages/styles/

# Look at calendar's component usage:
grep -r "from '@gostudiom/ui'" apps/calendar/
grep -r "from '@gostudiom/styles'" apps/calendar/
```

### Step 2: Use Shared Components

```typescript
// ❌ WRONG - Creating new button
import { Button } from '@/components/ui/Button';

// ✅ CORRECT - Using shared button
import { Button } from '@gostudiom/ui';
```

### Step 3: Check Calendar's Patterns

Look at `apps/calendar/` to understand:
- Color scheme (likely uses established brand colors)
- Component patterns (how forms are built)
- Layout structure (sidebar? header?)
- Typography scale
- Spacing system
- Animation patterns

### Example: Matching Calendar's Style

```typescript
// apps/analytics/components/PropertyCard.tsx

// Import shared components
import { 
  Card, 
  CardHeader, 
  CardContent,
  Badge,
  Button,
  Progress
} from '@gostudiom/ui';

// Import shared styles/utilities
import { cn } from '@gostudiom/ui/utils';

// Use consistent patterns from calendar
export function PropertyCard({ property }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{property.name}</h3>
          <Badge variant={property.status}>
            {property.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Use same metric display pattern as calendar */}
        <div className="grid grid-cols-2 gap-4">
          {/* Match calendar's metric cards */}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Likely Shared Components in packages/ui/

Based on typical monorepo patterns, check for:

```typescript
// Layout components
import { Layout, Sidebar, Header, Footer } from '@gostudiom/ui';

// Form components  
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
  Select,
  Checkbox,
  RadioGroup
} from '@gostudiom/ui';

// Display components
import {
  Card,
  Badge,
  Alert,
  Dialog,
  Tabs,
  Table,
  Avatar,
  Progress,
  Skeleton
} from '@gostudiom/ui';

// Navigation
import {
  Navigation,
  Breadcrumb,
  Pagination,
  Link
} from '@gostudiom/ui';

// Buttons and actions
import {
  Button,
  IconButton,
  DropdownMenu,
  ContextMenu
} from '@gostudiom/ui';
```

### Color Scheme Investigation

```typescript
// Check packages/styles/globals.css or tailwind.config.js
// Likely has custom colors like:
const colors = {
  primary: '???',     // Check what calendar uses
  secondary: '???',
  success: '???',
  warning: '???',
  danger: '???',
  
  // Brand colors
  brand: {
    airbnb: '#FF5A5F',  // Might be defined
    calendar: '???',     // Calendar app color
    analytics: '???'     // Your app color
  }
};
```

### Typography & Spacing

```typescript
// Match calendar's text styles
const textStyles = {
  // Check if calendar uses specific classes
  'text-heading': '???',
  'text-subheading': '???',
  'text-body': '???',
  'text-caption': '???'
};

// Match spacing scale
const spacing = {
  // Calendar likely uses consistent spacing
  xs: '???',
  sm: '???',
  md: '???',
  lg: '???',
  xl: '???'
};
```

### Analytics-Specific Components

Only create new components for analytics-specific needs:

```typescript
// apps/analytics/components/analytics/
// These are unique to analytics, not in shared UI

export { PropertySelector } from './PropertySelector';
export { PricingCalculator } from './PricingCalculator';
export { AIAssistant } from './AIAssistant';
export { OccupancyChart } from './OccupancyChart';
export { HealthScoreIndicator } from './HealthScoreIndicator';
```

### Layout Consistency

```typescript
// apps/analytics/app/layout.tsx

// Use same layout structure as calendar
import { Layout } from '@gostudiom/ui';
import { Sidebar } from '@gostudiom/ui';
import { Header } from '@gostudiom/ui';

// Import shared styles
import '@gostudiom/styles/globals.css';

export default function AnalyticsLayout({ children }) {
  return (
    <Layout>
      {/* Match calendar's layout structure */}
      <Header 
        // Use same header props as calendar
        logo="Analytics"
        navigation={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/upload', label: 'Upload' },
          { href: '/reports', label: 'Reports' }
        ]}
      />
      
      <div className="flex">
        {/* If calendar has sidebar, use same pattern */}
        <Sidebar items={sidebarItems} />
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </Layout>
  );
}
```

### Form Patterns

```typescript
// Match calendar's form patterns
import { useForm } from '@gostudiom/ui/hooks';
import { Form, FormField } from '@gostudiom/ui';

// Use same validation patterns
import { z } from 'zod';

const uploadSchema = z.object({
  // Match calendar's validation style
  files: z.array(z.instanceof(File)).min(1),
  autoAnalyze: z.boolean().default(true)
});

export function UploadForm() {
  const form = useForm({
    schema: uploadSchema,
    // Match calendar's form config
  });
  
  return (
    <Form {...form}>
      {/* Use same form structure as calendar */}
    </Form>
  );
}
```

### Icons

```typescript
// Check what icon library calendar uses
// Likely one of these:

// Option 1: Lucide (most common)
import { Upload, FileText, TrendingUp } from 'lucide-react';

// Option 2: Heroicons
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

// Option 3: Custom icon component
import { Icon } from '@gostudiom/ui';

// Use the SAME icon library as calendar
```

### Animation Patterns

```typescript
// Match calendar's animation library

// If calendar uses Framer Motion
import { motion } from 'framer-motion';

// If calendar uses CSS transitions
className="transition-all duration-200 ease-in-out"

// If calendar uses React Spring
import { useSpring, animated } from 'react-spring';

// Use SAME animation patterns
```

### Data Display Patterns

```typescript
// Match how calendar displays data

// If calendar uses tables
import { Table, TableHeader, TableBody, TableRow } from '@gostudiom/ui';

// If calendar uses cards
import { Card, CardGrid } from '@gostudiom/ui';

// If calendar uses lists
import { List, ListItem } from '@gostudiom/ui';

// Use same data display patterns
```

## Investigation Checklist for Claude Code

Before creating ANY UI components:

- [ ] Check `packages/ui/` directory structure
- [ ] List all exported components from `@gostudiom/ui`
- [ ] Check `packages/styles/` for design tokens
- [ ] Look at calendar's `package.json` for UI dependencies
- [ ] Examine 3-5 calendar components for patterns
- [ ] Identify color scheme from tailwind.config
- [ ] Note spacing and typography scales
- [ ] Check animation/transition patterns
- [ ] Identify icon library being used
- [ ] Understand form validation patterns

## Example Investigation Commands

```bash
# 1. Find all UI imports in calendar
find apps/calendar -name "*.tsx" -o -name "*.jsx" | xargs grep "from '@gostudiom/ui'"

# 2. Check shared UI package exports
cat packages/ui/index.ts

# 3. Find color definitions
grep -r "colors" packages/styles/
grep -r "primary" apps/calendar/

# 4. Check component patterns
head -50 apps/calendar/components/*.tsx

# 5. Find icon usage
grep -r "lucide-react\|heroicons\|react-icons" apps/calendar/
```

## Final Rule

**The analytics app should look like a natural extension of the calendar app, not a completely different product.**

Users should feel like they're using the same platform when switching between calendar and analytics.