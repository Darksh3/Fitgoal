import { type NextRequest, NextResponse } from "next/server"
import { CSRFTokenManager } from "@/lib/security"

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id") || request.ip || "anonymous"

    const token = CSRFTokenManager.generateToken(sessionId)

    return NextResponse.json({ token })
  } catch (error) {
    console.error("CSRF token generation error:", error)
    return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 })
  }
}
