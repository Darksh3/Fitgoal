import "server-only"
import { cookies } from "next/headers"
import jwt from "jsonwebtoken"

export async function isAdminRequest() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value
  if (!token) return false

  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET as string) as any
    return payload?.role === "admin"
  } catch {
    return false
  }
}
