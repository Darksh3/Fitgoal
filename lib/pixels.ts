// ============================================
// lib/pixels.ts
// Funções de rastreamento para Meta Pixel e TikTok Pixel
// ============================================

// ============================================
// META PIXEL (Facebook/Instagram)
// ============================================

const isMetaPixelLoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).fbq?.callMethod === 'function'
}h

export const initMetaPixel = (pixelId: string): void => {
  if (typeof window === 'undefined') return
  if ((window as any).fbq?.callMethod) return

  !(function (f: any, b, e, v, n?: any, t?: any, s?: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = true
    t.src = 'https://connect.facebook.net/en_US/fbevents.js'
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script')

    ; (window as any).fbq('init', pixelId)
    ; (window as any).fbq('track', 'PageView')
}

export const trackMetaEvent = (eventName: string, data?: Record<string, any>, eventId?: string): void => {
  if (!isMetaPixelLoaded()) return
  const options = eventId ? { eventID: eventId } : undefined
  if (data) {
    ; (window as any).fbq('track', eventName, data, options)
  } else {
    ; (window as any).fbq('track', eventName, undefined, options)
  }
}

export const trackMetaCustomEvent = (eventName: string, data?: Record<string, any>): void => {
  if (!isMetaPixelLoaded()) return
  if (data) {
    ; (window as any).fbq('trackCustom', eventName, data)
  } else {
    ; (window as any).fbq('trackCustom', eventName)
  }
}

// ============================================
// TIKTOK PIXEL
// ============================================

const isTikTokPixelLoaded = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).ttq !== 'undefined'
}

export const initTikTokPixel = (pixelId: string): void => {
  if (typeof window === 'undefined') return
  if ((window as any).ttq) return

  const ttq: any = ((window as any).ttq = (window as any).ttq || [])
  ttq.methods = [
    'page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
    'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie',
    'holdConsent', 'revokeConsent', 'grantConsent',
  ]

  ttq.setAndDefer = function (t: any, e: string) {
    t[e] = function (...args: any[]) {
      t.push([e, ...args])
    }
  }

  for (const method of ttq.methods) {
    ttq.setAndDefer(ttq, method)
  }

  ttq.instance = function (t: string) {
    const e = ttq._i[t] || []
    for (const method of ttq.methods) {
      ttq.setAndDefer(e, method)
    }
    return e
  }

  ttq.load = function (pixelCode: string, n?: any) {
    const i = 'https://analytics.tiktok.com/i18n/pixel/events.js'
    ttq._i = ttq._i || {}
    ttq._i[pixelCode] = []
    ttq._i[pixelCode]._u = i
    ttq._t = ttq._t || {}
    ttq._t[pixelCode] = +new Date()
    ttq._o = ttq._o || {}
    ttq._o[pixelCode] = n || {}

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = i + '?sdkid=' + pixelCode + '&lib=' + 'ttq'
    const firstScript = document.getElementsByTagName('script')[0]
    firstScript?.parentNode?.insertBefore(script, firstScript)
  }

  ttq.load(pixelId)
  ttq.page()
}

export const trackTikTokEvent = (eventName: string, data?: Record<string, any>): void => {
  if (!isTikTokPixelLoaded()) return
  if (data) {
    ; (window as any).ttq.track(eventName, data)
  } else {
    ; (window as any).ttq.track(eventName)
  }
}

// ============================================
// FUNÇÕES DE CONVENIÊNCIA (disparam nos dois)
// ============================================

/** PageView - automático em cada navegação */
export const trackPageView = (): void => {
  trackMetaEvent('PageView')
  if (isTikTokPixelLoaded()) {
    ; (window as any).ttq.page()
  }
}

/** ViewContent - landing page e página de vendas */
export const trackViewContent = (data?: {
  content_name?: string
  content_category?: string
  content_ids?: string[]
  content_type?: string
  value?: number
  currency?: string
}): void => {
  trackMetaEvent('ViewContent', data)
  trackTikTokEvent('ViewContent', data ? {
    content_id: data.content_ids?.[0],
    content_type: data.content_type || 'product',
    content_name: data.content_name,
    value: data.value,
    currency: data.currency || 'BRL',
  } : undefined)
}

/** Lead - quando o quiz é completado com sucesso */
export const trackLead = (data?: {
  content_name?: string
  content_category?: string
  value?: number
  currency?: string
}): void => {
  trackMetaEvent('Lead', data)
  trackTikTokEvent('SubmitForm', data ? {
    content_name: data.content_name || 'Quiz Completo',
    value: data.value,
    currency: data.currency || 'BRL',
  } : undefined)
  trackTikTokEvent('CompleteRegistration', {
    content_name: data?.content_name || 'Quiz FitGoal',
  })
}

/** InitiateCheckout - quando clica em "Escolher Plano" */
export const trackInitiateCheckout = (data?: {
  value?: number
  currency?: string
  content_name?: string
  content_ids?: string[]
  num_items?: number
  eventId?: string
}): void => {
  const eventId = data?.eventId
  trackMetaEvent('InitiateCheckout', data ? {
    value: data.value,
    currency: data.currency,
    content_name: data.content_name,
    content_ids: data.content_ids,
    num_items: data.num_items,
  } : undefined, eventId)
  trackTikTokEvent('InitiateCheckout', data ? {
    content_id: data.content_ids?.[0],
    content_name: data.content_name,
    value: data.value,
    currency: data.currency || 'BRL',
  } : undefined)
}

/** Purchase - quando o pagamento é confirmado */
export const trackPurchase = (data: {
  value: number
  currency?: string
  content_name?: string
  content_ids?: string[]
  content_type?: string
  num_items?: number
  order_id?: string
  eventId?: string
}): void => {
  // Passar eventId para deduplicação com server-side events
  const options = data.eventId ? { eventID: data.eventId } : undefined
  
  if (typeof window !== 'undefined' && (window as any).fbq) {
    ; (window as any).fbq('track', 'Purchase', {
      value: data.value,
      currency: data.currency || 'BRL',
      content_name: data.content_name,
      content_ids: data.content_ids,
      content_type: data.content_type || 'product',
      num_items: data.num_items || 1,
    }, options)
  }
  
  trackTikTokEvent('CompletePayment', {
    content_id: data.content_ids?.[0],
    content_type: data.content_type || 'product',
    content_name: data.content_name,
    value: data.value,
    currency: data.currency || 'BRL',
    quantity: data.num_items || 1,
  })
}

/** AddToCart - para uso futuro */
export const trackAddToCart = (data?: {
  value?: number
  currency?: string
  content_name?: string
  content_ids?: string[]
  content_type?: string
}): void => {
  trackMetaEvent('AddToCart', data)
  trackTikTokEvent('AddToCart', data ? {
    content_id: data.content_ids?.[0],
    content_type: data.content_type || 'product',
    content_name: data.content_name,
    value: data.value,
    currency: data.currency || 'BRL',
  } : undefined)
}

/** QuizStart - evento customizado quando o quiz começa */
export const trackQuizStart = (): void => {
  trackMetaCustomEvent('QuizStart', { content_name: 'Quiz FitGoal' })
  trackTikTokEvent('ClickButton', { content_name: 'Quiz Start' })
}

/** QuizStep - evento customizado para cada passo do quiz */
export const trackQuizStep = (step: number, totalSteps: number): void => {
  trackMetaCustomEvent('QuizStep', {
    step_number: step,
    total_steps: totalSteps,
    content_name: `Quiz Step ${step}/${totalSteps}`,
  })
}

/** PlanView - quando vê os planos de preço */
export const trackPlanView = (): void => {
  trackMetaCustomEvent('PlanView', { content_name: 'Planos FitGoal' })
  trackTikTokEvent('ViewContent', { content_name: 'Planos FitGoal' })
}
