import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { serialize } from "cookie"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    // 🔐 Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      )
    }

    // 🔐 Credenciais do admin (vem do .env)
    if (
      email !== process.env.ADMIN_EMAIL ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return NextResponse.json(
        { error: "Email ou senha incorretos" },
        { status: 401 }
      )
    }

    // 🎟️ Gera JWT de admin
    const token = jwt.sign(
      { role: "admin", email },
      process.env.ADMIN_JWT_SECRET as string,
      { expiresIn: "7d" }
    )

    // 🍪 Cookie httpOnly (seguro)
    const cookie = serialize("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    })

    const response = NextResponse.json({ success: true })
    response.headers.set("Set-Cookie", cookie)

    return response
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    )
  }
}
