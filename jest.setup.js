// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:9002'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/cleansweep_test'

// Polyfill for Request/Response in Node.js environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = input
      this.method = init?.method || 'GET'
      this.headers = new Map(Object.entries(init?.headers || {}))
      this.body = init?.body
    }
  }
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    
    async json() {
      return JSON.parse(this.body)
    }
  }
}

// Mock crypto.randomUUID if not available
if (!global.crypto) {
  global.crypto = {}
}
if (!global.crypto.randomUUID) {
  let counter = 0
  global.crypto.randomUUID = () => {
    counter++
    return `test-uuid-${counter}-${Date.now()}`
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors in tests unless explicitly testing error handling
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock Supabase server client
jest.mock('@/lib/supabase-server', () => {
  const mockChain = () => {
    const chain = {
      select: jest.fn(() => chain),
      from: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      neq: jest.fn(() => chain),
      not: jest.fn(() => chain),
      in: jest.fn(() => chain),
      gt: jest.fn(() => chain),
      gte: jest.fn(() => chain),
      lt: jest.fn(() => chain),
      lte: jest.fn(() => chain),
      order: jest.fn(() => chain),
      limit: jest.fn(() => chain),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
      then: (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
      data: [],
      error: null
    }
    return chain
  }
  
  return {
    createClient: jest.fn(() => ({
      from: jest.fn(() => mockChain()),
      auth: {
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null }))
      }
    }))
  }
})