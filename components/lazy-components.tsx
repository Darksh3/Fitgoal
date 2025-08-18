"use client"

import type React from "react"

import { lazy, Suspense } from "react"
import { Loader2 } from "lucide-react"

const LazyFloatingChat = lazy(() => import("./floating-chat"))
const LazyChatInterface = lazy(() => import("./chat-interface"))

// Loading fallback component
function ComponentLoader({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <span className="text-gray-600">{message}</span>
    </div>
  )
}

// Lazy wrapped components with error boundaries
export function LazyFloatingChatWrapper() {
  return (
    <Suspense fallback={<ComponentLoader message="Carregando chat..." />}>
      <LazyFloatingChat />
    </Suspense>
  )
}

export function LazyChatInterfaceWrapper() {
  return (
    <Suspense fallback={<ComponentLoader message="Carregando interface..." />}>
      <LazyChatInterface />
    </Suspense>
  )
}

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<T extends object>(Component: React.ComponentType<T>, fallbackMessage?: string) {
  return function LazyComponent(props: T) {
    return (
      <Suspense fallback={<ComponentLoader message={fallbackMessage} />}>
        <Component {...props} />
      </Suspense>
    )
  }
}
