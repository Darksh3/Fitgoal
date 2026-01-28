import { NextResponse } from "next/server"
import { serialize } from "cookie"

export async function POST() {
  try {
    // 🍪 Limpar cookie setando maxAge = 0
    const cookie = serialize("admin_token", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })

    const response = NextResponse.json({ success: true })
    response.headers.set("Set-Cookie", cookie)

    return response
  } catch (error) {
    console.error("Admin logout error:", error)
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    )
  }
}
