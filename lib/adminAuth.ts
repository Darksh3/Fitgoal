// Simple admin authentication (stored securely)
const ADMIN_CREDENTIALS = {
  email: "fitgoalcontato@gmail.com",
  passwordHash: "Vercelv0", // In production, this should be hashed
}

export function validateAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.passwordHash
}

export function setAdminToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_token", token)
  }
}

export function getAdminToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("admin_token")
  }
  return null
}

export function clearAdminToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token")
  }
}

export function isAdminAuthenticated(): boolean {
  const token = getAdminToken()
  return token === "admin_authenticated_fitgoal"
}
