'use client'

import { createContext, useContext, useEffect, Suspense, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  initMetaPixel,
  initTikTokPixel,
  trackPageView,
  trackViewContent,
  trackLead,
  trackPurchase,
  trackInitiateCheckout,
  trackAddToCart,
  trackQuizStart,
  trackQuizStep,
  trackPlanView,
  trackMetaEvent,
  trackMetaCustomEvent,
  trackTikTokEvent,
} from '@/lib/pixels'

interface PixelContextType {
  trackViewContent: typeof trackViewContent
  trackLead: typeof trackLead
  trackPurchase: typeof trackPurchase
  trackInitiateCheckout: typeof trackInitiateCheckout
  trackAddToCart: typeof trackAddToCart
  trackQuizStart: typeof trackQuizStart
  trackQuizStep: typeof trackQuizStep
  trackPlanView: typeof trackPlanView
  trackMetaEvent: typeof trackMetaEvent
  trackMetaCustomEvent: typeof trackMetaCustomEvent
  trackTikTokEvent: typeof trackTikTokEvent
}

const PixelContext = createContext<PixelContextType | null>(null)

const noopFn = (..._args: any[]) => {}

const fallbackContext: PixelContextType = {
  trackViewContent: noopFn,
  trackLead: noopFn,
  trackPurchase: noopFn as any,
  trackInitiateCheckout: noopFn,
  trackAddToCart: noopFn,
  trackQuizStart: noopFn,
  trackQuizStep: noopFn,
  trackPlanView: noopFn,
  trackMetaEvent: noopFn,
  trackMetaCustomEvent: noopFn,
  trackTikTokEvent: noopFn,
}

export const usePixel = (): PixelContextType => {
  const context = useContext(PixelContext)
  return context ?? fallbackContext
}

function PixelProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID

    if (metaPixelId) {
      initMetaPixel(metaPixelId)
    }

    if (tiktokPixelId) {
      initTikTokPixel(tiktokPixelId)
    }
  }, [])

  useEffect(() => {
    trackPageView()

    if (typeof window !== 'undefined') {
      const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'ttclid']
      utmParams.forEach((param) => {
        const value = searchParams.get(param)
        if (value) {
          try {
            sessionStorage.setItem(param, value)
          } catch (e) {
            // sessionStorage pode falhar em modo privado
          }
        }
      })
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (pathname === '/' || pathname === '/vendas' || pathname === '/sales') {
      trackViewContent({
        content_name: pathname === '/' ? 'Landing Page FitGoal' : 'Página de Vendas FitGoal',
        content_category: 'landing_page',
        content_type: 'product',
      })
    }
  }, [pathname])

  const contextValue: PixelContextType = {
    trackViewContent,
    trackLead,
    trackPurchase,
    trackInitiateCheckout,
    trackAddToCart,
    trackQuizStart,
    trackQuizStep,
    trackPlanView,
    trackMetaEvent,
    trackMetaCustomEvent,
    trackTikTokEvent,
  }

  return <PixelContext.Provider value={contextValue}>{children}</PixelContext.Provider>
}

export function PixelTracker({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PixelProvider>{children}</PixelProvider>
    </Suspense>
  )
}
