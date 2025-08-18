"use client"

import { toast } from "@/hooks/use-toast"

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

export class AppErrorHandler {
  private static instance: AppErrorHandler
  private errorLog: AppError[] = []

  private constructor() {}

  static getInstance(): AppErrorHandler {
    if (!AppErrorHandler.instance) {
      AppErrorHandler.instance = new AppErrorHandler()
    }
    return AppErrorHandler.instance
  }

  /**
   * Handle and log application errors
   */
  handleError(error: unknown, context?: string): AppError {
    const appError = this.createAppError(error, context)
    this.logError(appError)
    this.showUserError(appError)
    return appError
  }

  /**
   * Handle API errors specifically
   */
  handleApiError(response: Response, context?: string): AppError {
    const appError: AppError = {
      code: `API_ERROR_${response.status}`,
      message: this.getApiErrorMessage(response.status),
      details: { status: response.status, url: response.url },
      timestamp: new Date(),
    }

    if (context) {
      appError.message = `${context}: ${appError.message}`
    }

    this.logError(appError)
    this.showUserError(appError)
    return appError
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors: Record<string, string>, context?: string): AppError {
    const appError: AppError = {
      code: "VALIDATION_ERROR",
      message: context || "Dados inválidos fornecidos",
      details: errors,
      timestamp: new Date(),
    }

    this.logError(appError)

    // Show first validation error to user
    const firstError = Object.values(errors)[0]
    if (firstError) {
      toast({
        title: "Erro de Validação",
        description: firstError,
        variant: "destructive",
      })
    }

    return appError
  }

  /**
   * Handle Firebase errors
   */
  handleFirebaseError(error: any, context?: string): AppError {
    const appError: AppError = {
      code: error.code || "FIREBASE_ERROR",
      message: this.getFirebaseErrorMessage(error.code) || error.message,
      details: error,
      timestamp: new Date(),
    }

    if (context) {
      appError.message = `${context}: ${appError.message}`
    }

    this.logError(appError)
    this.showUserError(appError)
    return appError
  }

  /**
   * Create standardized app error from unknown error
   */
  private createAppError(error: unknown, context?: string): AppError {
    if (error instanceof Error) {
      return {
        code: error.name || "UNKNOWN_ERROR",
        message: context ? `${context}: ${error.message}` : error.message,
        details: error.stack,
        timestamp: new Date(),
      }
    }

    return {
      code: "UNKNOWN_ERROR",
      message: context ? `${context}: Erro desconhecido` : "Erro desconhecido",
      details: error,
      timestamp: new Date(),
    }
  }

  /**
   * Log error for debugging
   */
  private logError(error: AppError): void {
    console.error(`[${error.timestamp.toISOString()}] ${error.code}: ${error.message}`, error.details)

    // Keep only last 100 errors in memory
    this.errorLog.push(error)
    if (this.errorLog.length > 100) {
      this.errorLog.shift()
    }
  }

  /**
   * Show user-friendly error message
   */
  private showUserError(error: AppError): void {
    // Don't show validation errors here as they're handled separately
    if (error.code === "VALIDATION_ERROR") return

    toast({
      title: "Erro",
      description: this.getUserFriendlyMessage(error),
      variant: "destructive",
    })
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: AppError): string {
    const userFriendlyMessages: Record<string, string> = {
      NETWORK_ERROR: "Erro de conexão. Verifique sua internet.",
      API_ERROR_400: "Dados inválidos enviados.",
      API_ERROR_401: "Sessão expirada. Faça login novamente.",
      API_ERROR_403: "Acesso negado.",
      API_ERROR_404: "Recurso não encontrado.",
      API_ERROR_500: "Erro interno do servidor. Tente novamente.",
      FIREBASE_ERROR: "Erro no banco de dados. Tente novamente.",
      "auth/user-not-found": "Usuário não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/email-already-in-use": "Email já está em uso.",
      "auth/weak-password": "Senha muito fraca.",
      "auth/invalid-email": "Email inválido.",
    }

    return userFriendlyMessages[error.code] || error.message || "Erro inesperado"
  }

  /**
   * Get API error message based on status code
   */
  private getApiErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: "Requisição inválida",
      401: "Não autorizado",
      403: "Acesso proibido",
      404: "Não encontrado",
      429: "Muitas tentativas. Tente novamente mais tarde",
      500: "Erro interno do servidor",
      502: "Servidor indisponível",
      503: "Serviço temporariamente indisponível",
    }

    return messages[status] || `Erro HTTP ${status}`
  }

  /**
   * Get Firebase error message
   */
  private getFirebaseErrorMessage(code: string): string | null {
    const messages: Record<string, string> = {
      "auth/user-not-found": "Usuário não encontrado",
      "auth/wrong-password": "Senha incorreta",
      "auth/email-already-in-use": "Email já está em uso",
      "auth/weak-password": "Senha muito fraca",
      "auth/invalid-email": "Email inválido",
      "auth/user-disabled": "Conta desabilitada",
      "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde",
      "permission-denied": "Permissão negada",
      unavailable: "Serviço temporariamente indisponível",
    }

    return messages[code] || null
  }

  /**
   * Get error log for debugging
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog]
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = []
  }
}

// Export singleton instance
export const errorHandler = AppErrorHandler.getInstance()

// Convenience functions
export function handleError(error: unknown, context?: string): AppError {
  return errorHandler.handleError(error, context)
}

export function handleApiError(response: Response, context?: string): AppError {
  return errorHandler.handleApiError(response, context)
}

export function handleValidationError(errors: Record<string, string>, context?: string): AppError {
  return errorHandler.handleValidationError(errors, context)
}

export function handleFirebaseError(error: any, context?: string): AppError {
  return errorHandler.handleFirebaseError(error, context)
}
