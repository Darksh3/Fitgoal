import { type NextRequest, NextResponse } from "next/server"

export interface SecurityConfig {
  enableCSRF: boolean
  enableRateLimit: boolean
  maxRequestsPerMinute: number
  trustedOrigins: string[]
  sensitiveRoutes: string[]
}

const defaultConfig: SecurityConfig = {
  enableCSRF: true,
  enableRateLimit: true,
  maxRequestsPerMinute: 60,
  trustedOrigins: [
    "https://fitgoal.com.br",
    "https://www.fitgoal.com.br",
    "http://localhost:3000",
    "https://vercel.app",
  ],
  sensitiveRoutes: [
    "/api/generate-plans-on-demand",
    "/api/handle-post-checkout",
    "/api/create-checkout-stripe",
    "/api/chat",
  ],
}

// CSRF Token Management
class CSRFTokenManager {
  private static tokens = new Map<string, { token: string; expires: number }>()

  static generateToken(sessionId: string): string {
    const token = crypto.randomUUID()
    const expires = Date.now() + 60 * 60 * 1000 // 1 hour

    this.tokens.set(sessionId, { token, expires })

    // Cleanup expired tokens
    this.cleanupExpiredTokens()

    return token
  }

  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId)

    if (!stored || stored.expires < Date.now()) {
      this.tokens.delete(sessionId)
      return false
    }

    return stored.token === token
  }

  private static cleanupExpiredTokens(): void {
    const now = Date.now()
    for (const [sessionId, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(sessionId)
      }
    }
  }
}

// Rate Limiting Store
class RateLimitStore {
  private static requests = new Map<string, { count: number; resetTime: number }>()

  static checkLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const stored = this.requests.get(identifier)

    if (!stored || stored.resetTime < now) {
      this.requests.set(identifier, { count: 1, resetTime: now + windowMs })
      return true
    }

    if (stored.count >= maxRequests) {
      return false
    }

    stored.count++
    return true
  }

  static getRemainingRequests(identifier: string, maxRequests: number): number {
    const stored = this.requests.get(identifier)
    if (!stored || stored.resetTime < Date.now()) {
      return maxRequests
    }
    return Math.max(0, maxRequests - stored.count)
  }
}

// Security Middleware
export function createSecurityMiddleware(config: Partial<SecurityConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }

  return async function securityMiddleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const clientIP = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"
    const origin = request.headers.get("origin")
    const referer = request.headers.get("referer")

    // Rate Limiting
    if (finalConfig.enableRateLimit) {
      const identifier = `${clientIP}:${userAgent}`
      const allowed = RateLimitStore.checkLimit(
        identifier,
        finalConfig.maxRequestsPerMinute,
        60 * 1000, // 1 minute window
      )

      if (!allowed) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            retryAfter: 60,
            remaining: RateLimitStore.getRemainingRequests(identifier, finalConfig.maxRequestsPerMinute),
          },
          { status: 429 },
        )
      }
    }

    // Origin Validation for sensitive routes
    if (finalConfig.sensitiveRoutes.some((route) => pathname.startsWith(route))) {
      if (origin && !finalConfig.trustedOrigins.includes(origin)) {
        console.warn(`[Security] Untrusted origin attempt: ${origin} for ${pathname}`)
        return NextResponse.json({ error: "Origin not allowed" }, { status: 403 })
      }
    }

    // CSRF Protection for POST/PUT/DELETE requests
    if (finalConfig.enableCSRF && ["POST", "PUT", "DELETE"].includes(request.method)) {
      const csrfToken = request.headers.get("x-csrf-token")
      const sessionId = request.headers.get("x-session-id") || clientIP

      if (!csrfToken || !CSRFTokenManager.validateToken(sessionId, csrfToken)) {
        console.warn(`[Security] CSRF token validation failed for ${pathname}`)
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
      }
    }

    // Request Size Validation
    const contentLength = request.headers.get("content-length")
    if (contentLength && Number.parseInt(contentLength) > 10 * 1024 * 1024) {
      // 10MB limit
      return NextResponse.json({ error: "Request too large" }, { status: 413 })
    }

    // Security Headers
    const response = NextResponse.next()

    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    return response
  }
}

// API Route Security Wrapper
export function withSecurity(handler: Function, config: Partial<SecurityConfig> = {}) {
  return async function securedHandler(request: NextRequest) {
    const middleware = createSecurityMiddleware(config)
    const securityResponse = await middleware(request)

    if (securityResponse.status !== 200) {
      return securityResponse
    }

    try {
      return await handler(request)
    } catch (error) {
      console.error("[Security] Handler error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}

// Input Sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
      .replace(/javascript:/gi, "") // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, "") // Remove event handlers
      .replace(/[<>]/g, "") // Remove angle brackets
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value)
    }
    return sanitized
  }

  return input
}

// API Key Validation
export function validateApiKey(request: NextRequest, requiredKey: string): boolean {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "")

  if (!apiKey || !requiredKey) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.subtle.timingSafeEqual(new TextEncoder().encode(apiKey), new TextEncoder().encode(requiredKey))
}

// Session Security
export function generateSecureSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// Export utilities
export { CSRFTokenManager, RateLimitStore }
