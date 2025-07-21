const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cleansweep',
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/008_add_cancellation_extension_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Apply migration
    console.log('Applying cancellation and extension tracking migration...');
    await pool.query(migrationSQL);
    console.log('Migration applied successfully!');

    // Check if columns exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'schedule_items'
      AND column_name IN ('original_check_in', 'original_check_out', 'cancelled_at', 'is_extended', 'extension_count');
    `);
    
    console.log('New columns added:', checkResult.rows.map(r => r.column_name).join(', '));
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();