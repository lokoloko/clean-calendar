import { query } from '../lib/db/client'

async function checkMetrics() {
  console.log('🔍 Checking metrics in database...\n');
  
  // Get all metrics
  const metricsResult = await query(
    `SELECT pm.*, p.name as property_name 
     FROM analytics.property_metrics pm
     JOIN analytics.properties p ON p.id = pm.property_id
     ORDER BY pm.created_at DESC`
  );
  
  console.log(`Found ${metricsResult.rows.length} metrics:\n`);
  
  for (const metric of metricsResult.rows) {
    console.log(`Property: ${metric.property_name}`);
    console.log(`  Revenue: $${metric.revenue}`);
    console.log(`  Occupancy: ${metric.occupancy_rate}%`);
    console.log(`  Source: ${metric.source}`);
    console.log(`  Created: ${metric.created_at}\n`);
  }
  
  // Check properties without metrics
  const noMetricsResult = await query(
    `SELECT p.id, p.name 
     FROM analytics.properties p
     LEFT JOIN analytics.property_metrics pm ON pm.property_id = p.id
     WHERE pm.id IS NULL`
  );
  
  if (noMetricsResult.rows.length > 0) {
    console.log(`⚠️ Properties without metrics: ${noMetricsResult.rows.length}`);
    for (const prop of noMetricsResult.rows) {
      console.log(`  - ${prop.name} (${prop.id})`);
    }
  }
  
  process.exit(0);
}

checkMetrics().catch(console.error);