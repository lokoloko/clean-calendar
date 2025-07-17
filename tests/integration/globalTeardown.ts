import { testPool } from './setup'

export default async function globalTeardown() {
  console.log('Cleaning up test database...')
  await testPool.end()
}