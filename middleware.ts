import type { NextRequest } from "next/server"
import { createSecurityMiddleware } from "@/lib/security"

const securityMiddleware = createSecurityMiddleware({
  enableCSRF: true,
  enableRateLimit: true,
  maxRequestsPerMinute: 100,
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
})

export async function middleware(request: NextRequest) {
  return await securityMiddleware(request)
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/quiz/:path*", "/checkout/:path*"],
}
