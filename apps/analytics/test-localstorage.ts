import { PropertyStore } from './lib/storage/property-store'

// Check what's in localStorage
const properties = PropertyStore.getAll()
console.log(`Found ${properties.length} properties in localStorage:`)

properties.forEach(prop => {
  console.log(`\n📊 ${prop.name}:`)
  console.log(`  - ID: ${prop.id}`)
  console.log(`  - Has CSV: ${!!prop.dataSources?.csv}`)
  console.log(`  - CSV metrics: ${prop.dataSources?.csv?.propertyMetrics?.length || 0}`)
})