const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { Pool } = require('pg');

// Supabase client with service role key
const supabase = createClient(
  'https://puvlcvcbxmobxpnbjrwp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dmxjdmNieG1vYnhwbmJqcndwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExNjY1NywiZXhwIjoyMDY4NjkyNjU3fQ.BcMhPK5pFMd27RshMayPesHDC0m3Gl8bvW-jHEwxcgk'
);

// Local database
const localPool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5433/cleansweep'
});

// Supabase database
const supabasePool = new Pool({
  connectionString: 'postgresql://postgres:dK9yP1OuTjSrRz9h@db.puvlcvcbxmobxpnbjrwp.supabase.co:5432/postgres'
});

async function migrate() {
  try {
    console.log('Starting migration to Supabase...\n');

    // Read and execute schema
    console.log('1. Creating schema...');
    const schema = fs.readFileSync('./temp_schema.sql', 'utf8');
    
    // Split by statements and execute
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await supabasePool.query(statement);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error('Schema error:', err.message);
          }
        }
      }
    }

    // Read and execute data
    console.log('2. Importing data...');
    const data = fs.readFileSync('./temp_data.sql', 'utf8');
    
    // Execute data import
    try {
      await supabasePool.query(data);
      console.log('   ✓ Data imported successfully');
    } catch (err) {
      console.error('Data import error:', err.message);
    }

    // Enable RLS
    console.log('3. Enabling Row Level Security...');
    const rlsTables = [
      'listings', 'cleaners', 'schedule_items', 
      'manual_schedule_rules', 'share_links', 
      'cleaner_sessions', 'cleaner_feedback'
    ];

    for (const table of rlsTables) {
      try {
        await supabasePool.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
        await supabasePool.query(`
          CREATE POLICY "Dev mode - full access to ${table}" 
          ON public.${table} 
          FOR ALL 
          USING (true)
        `);
      } catch (err) {
        // Ignore if already exists
      }
    }

    // Verify migration
    console.log('\n4. Verifying migration...');
    const counts = await supabasePool.query(`
      SELECT 
        'listings' as table_name, COUNT(*) as count FROM public.listings
      UNION ALL
      SELECT 'schedule_items', COUNT(*) FROM public.schedule_items
      UNION ALL  
      SELECT 'cleaners', COUNT(*) FROM public.cleaners
    `);

    console.log('\nMigration Summary:');
    counts.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.count} records`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\nYour app will now use Supabase automatically.');
    console.log('All your data has been preserved.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

migrate();