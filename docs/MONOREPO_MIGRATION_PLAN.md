# Monorepo Migration Plan

## Overview

This document outlines the plan to migrate CleanSweep from a single-app structure to a monorepo architecture, preparing for future multi-app expansion under the GoStudioM brand.

**Current Status**: Single Next.js app at project root  
**Target Status**: App moved to `apps/cleaning` with workspace structure  
**Estimated Time**: 1-2 hours  
**Risk Level**: Low - primarily moving files and updating paths

## Why Migrate Now?

1. **Project is 55% complete** - Good time for infrastructure changes before adding more complexity
2. **Before payment integration** - Easier to reorganize before Stripe integration
3. **Foundation for growth** - Analytics app and other products planned
4. **Minimal disruption** - Codebase is still manageable size
5. **Team familiarity** - Better to adapt now than after launch

## Target Architecture

```
clean-calendar/                    # Repository root
├── apps/                         # All applications
│   ├── cleaning/                 # Current CleanSweep app
│   │   ├── src/                 # App source code
│   │   ├── public/              # Static assets
│   │   ├── package.json         # App dependencies
│   │   ├── tsconfig.json        # TypeScript config
│   │   ├── next.config.ts       # Next.js config
│   │   └── ...                  # Other app-specific files
│   ├── analytics/               # Future: Airbnb analytics
│   ├── marketplace/             # Future: Cleaner marketplace
│   └── landing/                 # Future: Marketing site
├── packages/                    # Shared packages (future)
│   ├── ui/                     # Shared components
│   ├── database/               # Shared DB client
│   ├── auth/                   # Shared auth logic
│   └── types/                  # Shared TypeScript types
├── supabase/                   # Database (stays at root)
├── docs/                       # Documentation (stays at root)
├── scripts/                    # Utility scripts (stays at root)
├── package.json                # Workspace root
├── turbo.json                  # Turborepo config
└── README.md                   # Project documentation
```

## Migration Steps

### Phase 1: Directory Restructure (30 min)

1. **Create new structure**
   ```bash
   mkdir -p apps/cleaning
   ```

2. **Move app-specific files to `apps/cleaning`**
   - `src/` → `apps/cleaning/src/`
   - `public/` → `apps/cleaning/public/`
   - `next.config.ts`
   - `next-env.d.ts`
   - `tsconfig.json`
   - `tailwind.config.ts`
   - `postcss.config.mjs`
   - `components.json`
   - `.eslintrc.json`
   - `jest.config.js`
   - `jest.setup.js`
   - `playwright.config.ts`
   - `vercel.json`

3. **Keep at root** (shared resources)
   - `supabase/`
   - `docs/`
   - `scripts/`
   - `.git/`
   - `.github/`
   - Docker files
   - Environment files

### Phase 2: Configuration Updates (45 min)

1. **Create root `package.json`**
   ```json
   {
     "name": "clean-calendar",
     "version": "1.0.0",
     "private": true,
     "workspaces": [
       "apps/*",
       "packages/*"
     ],
     "scripts": {
       "dev": "turbo run dev",
       "build": "turbo run build",
       "cleaning:dev": "npm run dev --workspace=apps/cleaning",
       "cleaning:build": "npm run build --workspace=apps/cleaning"
     },
     "devDependencies": {
       "turbo": "latest"
     }
   }
   ```

2. **Update `apps/cleaning/package.json`**
   - Change name to `@cleancalendar/cleaning`
   - Remove workspace-level dependencies

3. **Create `turbo.json`**
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "!.next/cache/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       }
     }
   }
   ```

4. **Update `apps/cleaning/tsconfig.json`**
   - Update paths to reference correct directories
   - Ensure `@/` alias points to `src/`

5. **Update imports in moved files**
   - Supabase migrations: `../../supabase/migrations`
   - Shared scripts: `../../scripts`
   - Documentation: `../../docs`

### Phase 3: Build & Deployment (30 min)

1. **Update `.gitignore`**
   ```
   # Turbo
   .turbo
   
   # App-specific
   apps/*/node_modules
   apps/*/.next
   ```

2. **Update Docker configurations**
   - Update `WORKDIR` to `/app/apps/cleaning`
   - Update build paths

3. **Update CI/CD**
   - GitHub Actions: Update working directories
   - Vercel: Set root directory to `apps/cleaning`

4. **Update environment variables**
   - No changes needed (loaded from root)

### Phase 4: Testing (15 min)

1. **Local development**
   ```bash
   npm install
   npm run dev
   ```

2. **Build test**
   ```bash
   npm run build
   ```

3. **Docker test**
   ```bash
   docker-compose up -d
   ```

## Benefits

1. **Clean separation** - App code vs shared resources
2. **Future-ready** - Easy to add new apps
3. **Independent development** - Apps can evolve separately
4. **Shared resources** - Database, auth, UI components
5. **Better organization** - Clear boundaries

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Path updates | Build failures | Systematic update, test each change |
| Deployment | Vercel config | Update root directory setting |
| Development flow | Team confusion | Clear documentation, quick migration |
| Docker setup | Local dev issues | Update compose files carefully |

## Rollback Plan

If issues arise:
1. Git reset to pre-migration commit
2. Move files back to root
3. Restore original package.json
4. Deploy from backup branch

## Future Expansion

Once migrated, adding new apps is simple:

```bash
# Add analytics app
mkdir apps/analytics
cd apps/analytics
npx create-next-app@latest . --typescript --tailwind

# Share database
import { db } from '@cleancalendar/database'

# Share UI components  
import { Button } from '@cleancalendar/ui'
```

## Timeline

- **Week 1 Post-Launch**: Execute migration
- **Week 2**: Stabilize and optimize
- **Month 1**: Add shared packages
- **Month 2**: Start analytics app

## Success Criteria

- [ ] All tests pass
- [ ] Development workflow unchanged
- [ ] Build and deploy successful
- [ ] No functionality changes
- [ ] Team onboarded to new structure

---

*Last Updated: July 31, 2025*

---

## Updated Plan (August 3, 2025): Conservative Monorepo Migration

### New Approach: Minimal Impact Migration

Based on the need to minimize breaking changes while the app is in production, we're adopting a more conservative migration strategy.

#### Core Principle: Keep Everything Working

- Landing page stays exactly where it is
- All existing routes remain unchanged
- No breaking changes for users
- Gradual, reversible changes only

#### Revised Migration Strategy

**Phase 1: Add Monorepo Tools (No Code Movement)**
1. Install Turborepo at root level
2. Configure to recognize current location as `apps/cleaning`
3. All existing code stays in place
4. Create empty `apps/analytics` directory

**Phase 2: Build New Apps Alongside**
1. Create analytics app in `apps/analytics`
2. Import shared code via relative paths initially
3. Test thoroughly before any extraction
4. Deploy analytics to `/analytics` route

**Phase 3: Gradual Package Extraction**
1. Copy (don't move) shared UI components to `packages/ui`
2. New apps use packages, existing app unchanged
3. Update existing app only after thorough testing
4. Always maintain ability to rollback

#### What Stays the Same
- ✅ Landing page location and content
- ✅ All existing routes and URLs
- ✅ Database connections
- ✅ Authentication flow
- ✅ Current deployment process
- ✅ All API endpoints

#### What Changes Gradually
- 📦 Shared code gets copied to packages (not moved)
- 🆕 New apps added in `apps/` directory
- 🔄 Imports updated only after testing

#### Branch Strategy
- All work on `feature/monorepo-migration` branch
- Main branch remains untouched
- Easy rollback if issues arise

This conservative approach ensures zero downtime and minimal risk while building the foundation for GoStudioM's multi-tool platform.

*Last Updated: August 3, 2025*