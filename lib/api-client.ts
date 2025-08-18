"use client"

import { handleApiError, handleError } from "./error-handler"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      "Content-Type": "application/json",
    }
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const config: RequestInit = {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      }

      const response = await fetch(url, config)

      if (!response.ok) {
        handleApiError(response, `API request to ${endpoint}`)
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      handleError(error, `API request to ${endpoint}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint
    return this.request<T>(url, { method: "GET" })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  /**
   * Upload file
   */
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value)
        })
      }

      return this.request<T>(endpoint, {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      })
    } catch (error) {
      handleError(error, `File upload to ${endpoint}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Convenience methods for common API calls
export const api = {
  // Plans
  generatePlans: (userId: string, quizData?: any) => apiClient.post("/generate-plans-on-demand", { userId, quizData }),

  // Leads
  getLeads: (params?: { status?: string; limit?: string; daysAgo?: string }) => apiClient.get("/get-leads", params),

  updateLeadStatus: (leadId: string, status: string) => apiClient.post("/update-lead-status", { leadId, status }),

  // Payments
  createPaymentIntent: (data: { email: string; planType: string; clientUid: string }) =>
    apiClient.post("/create-payment-intent", data),

  createSubscription: (data: {
    customerId: string
    paymentMethodId: string
    priceId: string
    clientUid: string
  }) => apiClient.post("/create-subscription", data),

  // Chat
  sendChatMessage: (message: string, context?: any) => apiClient.post("/chat", { message, context }),
}
