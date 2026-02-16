export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL
  
  if (!url) {
    console.error("[v0] NEXT_PUBLIC_URL not configured")
    // Fallback para desenvolvimento local
    return "http://localhost:3000"
  }

  // Remover trailing slash se existir
  return url.endsWith("/") ? url.slice(0, -1) : url
}

export const CONFIG = {
  getBaseUrl,
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
}
