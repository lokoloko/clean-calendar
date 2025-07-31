/**
 * Setup file for all tests - provides proper mocks for Next.js server components
 */

// Mock Next.js server module
jest.mock('next/server', () => {
  class MockHeaders {
    private headers: Map<string, string>

    constructor(init?: HeadersInit) {
      this.headers = new Map()
      if (init) {
        if (init instanceof Map) {
          this.headers = new Map(init)
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.headers.set(key, value))
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this.headers.set(key, String(value))
          })
        }
      }
    }

    get(name: string): string | null {
      return this.headers.get(name) || null
    }

    entries() {
      return this.headers.entries()
    }
  }

  class MockURL {
    pathname: string
    searchParams: URLSearchParams
    href: string

    constructor(url: string) {
      const urlObj = new URL(url)
      this.pathname = urlObj.pathname
      this.searchParams = urlObj.searchParams
      this.href = url
    }
  }

  class MockNextRequest {
    url: string
    method: string
    headers: MockHeaders
    nextUrl: MockURL
    private _body: any

    constructor(url: string | Request, init?: RequestInit) {
      if (typeof url === 'string') {
        this.url = url
        this.method = init?.method || 'GET'
        this.headers = new MockHeaders(init?.headers)
        this.nextUrl = new MockURL(url)
        this._body = init?.body
      } else {
        // Handle Request object
        this.url = url.url
        this.method = url.method
        this.headers = new MockHeaders()
        this.nextUrl = new MockURL(url.url)
        this._body = null
      }
    }

    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body)
      }
      return this._body
    }
  }

  class MockNextResponse extends Response {
    static json(data: any, init?: ResponseInit) {
      const response = new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...init?.headers
        }
      })
      
      // Copy properties to match NextResponse behavior
      Object.setPrototypeOf(response, MockNextResponse.prototype)
      return response
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse
  }
})

// Export for use in tests
export {}