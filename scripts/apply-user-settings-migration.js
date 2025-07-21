const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/cleansweep',
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/007_add_user_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Apply migration
    console.log('Applying user settings migration...');
    await pool.query(migrationSQL);
    console.log('Migration applied successfully!');

    // Check if table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings'
      );
    `);
    
    console.log('Table exists:', checkResult.rows[0].exists);
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await pool.end();
  }
}

applyMigration();