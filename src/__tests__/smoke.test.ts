import { render } from '@testing-library/react'

describe('Smoke Tests', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true)
  })

  it('should have environment variables', () => {
    expect(process.env.NODE_ENV).toBeDefined()
  })

  it('should be able to import testing library', () => {
    expect(render).toBeDefined()
  })
})