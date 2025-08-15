import { query } from '../lib/db/client'

async function clearAllData() {
  console.log('🗑️ Clearing all data...\n');
  
  try {
    // Clear in order (respect foreign keys)
    await query('DELETE FROM analytics.property_metrics');
    await query('DELETE FROM analytics.data_sources');
    await query('DELETE FROM analytics.properties');
    
    console.log('✅ All data cleared');
    
    // Show counts
    const propCount = await query('SELECT COUNT(*) FROM analytics.properties');
    const metricsCount = await query('SELECT COUNT(*) FROM analytics.property_metrics');
    
    console.log(`\n📊 Current counts:`);
    console.log(`   Properties: ${propCount.rows[0].count}`);
    console.log(`   Metrics: ${metricsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

clearAllData();
