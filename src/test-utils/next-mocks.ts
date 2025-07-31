/**
 * Mock implementations for Next.js server components in test environment
 */

// Mock NextRequest for tests
export class MockNextRequest {
  public url: string
  public method: string
  public headers: Headers
  private _body: any
  public nextUrl: URL

  constructor(url: string, init?: RequestInit) {
    this.url = url
    this.method = init?.method || 'GET'
    this.headers = new Headers(init?.headers || {})
    this._body = init?.body
    this.nextUrl = new URL(url)
  }

  async json() {
    if (typeof this._body === 'string') {
      return JSON.parse(this._body)
    }
    return this._body
  }

  clone() {
    return new MockNextRequest(this.url, {
      method: this.method,
      headers: this.headers,
      body: this._body
    })
  }
}

// Mock NextResponse for tests
export class MockNextResponse extends Response {
  static json(data: any, init?: ResponseInit) {
    return new MockNextResponse(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...init?.headers
      }
    })
  }
}

// Helper to setup Next.js mocks in tests
export function setupNextMocks() {
  // @ts-ignore
  global.NextRequest = MockNextRequest
  // @ts-ignore
  global.NextResponse = MockNextResponse
}