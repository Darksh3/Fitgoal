// Admin authentication via cookies (JWT)
export function getAdminCookie(): string | null {
  if (typeof document === "undefined") return null
  
  const cookies = document.cookie.split("; ")
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=")
    if (name === "admin_token") {
      return decodeURIComponent(value)
    }
  }
  return null
}

export function isAdminAuthenticated(): boolean {
  const token = getAdminCookie()
  // Se o cookie admin_token existe, o usuário está autenticado
  // (o backend garante que ele é um JWT válido)
  return !!token
}

export function clearAdminToken(): void {
  // Limpar o cookie setando maxAge = 0
  if (typeof document !== "undefined") {
    document.cookie = "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
  }
}
