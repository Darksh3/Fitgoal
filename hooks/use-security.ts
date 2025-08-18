"use client"

import { useState, useEffect } from "react"

export function useCSRFToken() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCSRFToken() {
      try {
        const response = await fetch("/api/csrf-token", {
          method: "GET",
          credentials: "same-origin",
        })

        if (response.ok) {
          const data = await response.json()
          setCSRFToken(data.token)
        }
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCSRFToken()
  }, [])

  return { csrfToken, loading }
}

export function useSecureRequest() {
  const { csrfToken } = useCSRFToken()

  const secureRequest = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers)

    // Add CSRF token for state-changing requests
    if (["POST", "PUT", "DELETE"].includes(options.method?.toUpperCase() || "GET")) {
      if (csrfToken) {
        headers.set("X-CSRF-Token", csrfToken)
      }
      headers.set("X-Session-ID", getSessionId())
    }

    // Add security headers
    headers.set("X-Requested-With", "XMLHttpRequest")

    return fetch(url, {
      ...options,
      headers,
      credentials: "same-origin",
    })
  }

  return { secureRequest, csrfToken }
}

function getSessionId(): string {
  let sessionId = localStorage.getItem("session-id")
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem("session-id", sessionId)
  }
  return sessionId
}

export function useSecurityMonitor() {
  const [securityEvents, setSecurityEvents] = useState<
    Array<{
      type: string
      message: string
      timestamp: Date
    }>
  >([])

  const logSecurityEvent = (type: string, message: string) => {
    setSecurityEvents((prev) => [
      ...prev.slice(-99), // Keep only last 100 events
      { type, message, timestamp: new Date() },
    ])
  }

  return { securityEvents, logSecurityEvent }
}
