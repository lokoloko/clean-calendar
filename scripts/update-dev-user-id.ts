#!/usr/bin/env node

/**
 * Updates all API routes to use the env helper instead of hardcoded DEV_USER_ID
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const files = [
  'src/app/api/schedule/[id]/route.ts',
  'src/app/api/sync-all/route.ts',
  'src/app/api/listings/[id]/sync/route.ts',
  'src/app/api/listings/[id]/route.ts',
  'src/app/api/stats/cancellations/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/manual-schedules/route.ts',
  'src/app/api/manual-schedules/cleanup/route.ts',
  'src/app/api/assignments/route.ts',
  'src/app/api/cleaner/auth/send-code/route.ts',
  'src/app/api/cleaners/[id]/route.ts',
  'src/app/api/cleaners/route.ts',
  'src/app/api/listings/route.ts',
  'src/app/api/schedule/route.ts',
  'src/app/api/schedule/share/manage/route.ts',
  'src/app/api/schedule/share/route.ts',
];

files.forEach(file => {
  const filePath = resolve(process.cwd(), file);
  
  try {
    let content = readFileSync(filePath, 'utf8');
    
    // Check if it has the old pattern
    if (content.includes("const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'")) {
      // Add import if not present
      if (!content.includes("import { env } from '@/lib/env'")) {
        // Find the last import statement
        const importMatch = content.match(/import[^;]+from[^;]+;/g);
        if (importMatch) {
          const lastImport = importMatch[importMatch.length - 1];
          const lastImportIndex = content.lastIndexOf(lastImport);
          content = content.slice(0, lastImportIndex + lastImport.length) + 
            "\nimport { env } from '@/lib/env';" +
            content.slice(lastImportIndex + lastImport.length);
        }
      }
      
      // Replace the const declaration
      content = content.replace(
        "const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'",
        "const DEV_USER_ID = env.devUserId"
      );
      
      writeFileSync(filePath, content);
      console.log(`✅ Updated ${file}`);
    } else {
      console.log(`⏭️  Skipped ${file} (already updated or different pattern)`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error);
  }
});

console.log('\nDone!');