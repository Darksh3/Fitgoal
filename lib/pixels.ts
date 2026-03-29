// ============================================
// lib/pixels.ts
// Funções de rastreamento para Meta Pixel e TikTok Pixel
// ============================================

// ============================================
// UTILS - Hashing SHA-256 (client-side)
// ============================================
async function hashSHA256Client(value: string): Promise<string> {
          if (!value || typeof value !== 'string') return ''
          const trimmed = value.trim().toLowerCase()
          if (!trimmed) return ''
          const encoder = new TextEncoder()
          const data = encoder.encode(trimmed)
          const hashBuffer = await crypto.subtle.digest('SHA-256', data)
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ============================================
// META PIXEL (Facebook/Instagram)
// ============================================
const isMetaPixelLoaded = (): boolean => {
          return typeof window !== 'undefined' && typeof (window as any).fbq?.callMethod === 'function'
}

export const initMetaPixel = (pixelId: string): void => {
          if (typeof window === 'undefined') return
          if ((window as any).fbq?.callMethod) return
          !(function (f: any, b, e, v, n?: any, t?: any, s?: any) {
                      if (f.fbq) return
                      n = f.fbq = function () {
                                    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
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
          ;(window as any).fbq('init', pixelId)
          ;(window as any).fbq('track', 'PageView')
}

export const trackMetaEvent = (eventName: string, data?: Record<string, any>, eventId?: string): void => {
          if (!isMetaPixelLoaded()) return
          const options = eventId ? { eventID: eventId } : undefined
          if (data) {
                      ;(window as any).fbq('track', eventName, data, options)
          } else {
                      ;(window as any).fbq('track', eventName, undefined, options)
          }
}

export const trackMetaCustomEvent = (eventName: string, data?: Record<string, any>): void => {
          if (!isMetaPixelLoaded()) return
          if (data) {
                      ;(window as any).fbq('trackCustom', eventName, data)
          } else {
                      ;(window as any).fbq('trackCustom', eventName)
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
          if ((window as any).ttq && !Array.isArray((window as any).ttq)) return
          !(function (w: any, d: any, t: string) {
                      w[t] = w[t] || []
                                  w[t].methods = [
                                                'page',
                                                'track',
                                                'identify',
                                                'instances',
                                                'debug',
                                                'on',
                                                'off',
                                                'once',
                                                'ready',
                                                'alias',
                                                'group',
                                                'enableCookie',
                                                'disableCookie',
                                                'holdConsent',
                                                'revokeConsent',
                                                'grantConsent',
                                              ]
                      w[t].setAndDefer = function (t: any, e: string) {
                                    t[e] = function () {
                                                    t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
                                    }
                      }
                      for (let i = 0; i < w[t].methods.length; i++) {
                                    w[t].setAndDefer(w[t], w[t].methods[i])
                      }
                      w[t].instance = function (t: string) {
                                    const e = w['ttq']._i[t] || []
                                                  for (let n = 0; n < w['ttq'].methods.length; n++) {
                                                                  w['ttq'].setAndDefer(e, w['ttq'].methods[n])
                                                  }
                                    return e
                      }
                      w[t].load = function (e: string, n?: any) {
                                    const i = 'https://analytics.tiktok.com/i18n/pixel/events.js'
                                    w[t]._i = w[t]._i || {}
                                                  w[t]._i[e] = []
                                                                w[t]._i[e]._u = i
                                    w[t]._t = w[t]._t || {}
                                                  w[t]._t[e] = +new Date()
                                    w[t]._o = w[t]._o || {}
                                                  w[t]._o[e] = n || {}
                                                                const s = d.createElement('script')
                                    s.type = 'text/javascript'
                                    s.async = true
                                    s.src = i + '?sdkid=' + e + '&lib=' + t
                                    const f = d.getElementsByTagName('script')[0]
                                    f.parentNode.insertBefore(s, f)
                      }
                      // CRÍTICO: TiktokAnalyticsObject deve ser definido ANTES do load()
                // para que o SDK real substitua corretamente o stub ao carregar
                w.TiktokAnalyticsObject = t
          })(window, document, 'ttq')
          ;(window as any).ttq.load(pixelId)
          ;(window as any).ttq.page()
}

export const trackTikTokEvent = (eventName: string, data?: Record<string, any>): void => {
          if (!isTikTokPixelLoaded()) return
          if (data) {
                      ;(window as any).ttq.track(eventName, data)
          } else {
                      ;(window as any).ttq.track(eventName)
          }
}

/**
         * identifyTikTokUser - envia dados do usuário hasheados para o TikTok Pixel
         * Melhora o EMQ score ao fornecer email, phone e external_id
         * Deve ser chamado logo após o usuário fornecer email/telefone (quiz, login, checkout)
         */
export const identifyTikTokUser = async (options: {
          email?: string
          phone?: string
          externalId?: string
}): Promise<void> => {
          if (!isTikTokPixelLoaded()) return
          if (!options.email && !options.phone && !options.externalId) return

          const identifyData: Record<string, string> = {}

                    if (options.email) {
                                const hashed = await hashSHA256Client(options.email)
                                if (hashed) identifyData.email = hashed
                    }

          if (options.phone) {
                      // Normalizar para formato E.164: remover espaços, garantir +55 para BR
            let phone = options.phone.replace(/\D/g, '')
                      if (phone.length === 11 || phone.length === 10) phone = '55' + phone
                      if (!phone.startsWith('+')) phone = '+' + phone
                      const hashed = await hashSHA256Client(phone)
                      if (hashed) identifyData.phone_number = hashed
          }

          if (options.externalId) {
                      const hashed = await hashSHA256Client(options.externalId)
                      if (hashed) identifyData.external_id = hashed
          }

          if (Object.keys(identifyData).length > 0) {
                      ;(window as any).ttq.identify(identifyData)
          }
}

// ============================================
// FUNÇÕES DE CONVENIÊNCIA (disparam nos dois)
// ============================================

/** PageView - automático em cada navegação */
export const trackPageView = (): void => {
          trackMetaEvent('PageView')
          if (isTikTokPixelLoaded()) {
                      ;(window as any).ttq.page()
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
          // FIX: content_id sempre obrigatório com valor não-vazio
          trackTikTokEvent('ViewContent', {
                      content_id: data?.content_ids?.[0] || 'fitgoal_plano',
                      content_type: data?.content_type || 'product',
                      content_name: data?.content_name || 'FitGoal',
                      value: data?.value,
                      currency: data?.currency || 'BRL',
          })
}

/** Lead - quando o quiz é completado com sucesso */
export const trackLead = (data?: {
          content_name?: string
          content_category?: string
          value?: number
          currency?: string
          email?: string
          phone?: string
          userId?: string
}): void => {
          trackMetaEvent('Lead', data)

          // Identificar usuário no TikTok com dados hasheados (melhora EMQ)
          if (data?.email || data?.phone || data?.userId) {
                      identifyTikTokUser({
                                    email: data?.email,
                                    phone: data?.phone,
                                    externalId: data?.userId,
                      })
          }

          trackTikTokEvent('SubmitForm', {
                      // FIX: content_id sempre obrigatório com valor não-vazio
                               content_id: 'quiz_fitgoal',
                      content_name: data?.content_name || 'Quiz Completo',
                      value: data?.value,
                      currency: data?.currency || 'BRL',
          })

          trackTikTokEvent('CompleteRegistration', {
                      // FIX: content_id sempre obrigatório com valor não-vazio
                               content_id: 'quiz_fitgoal',
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
          email?: string
          phone?: string
          userId?: string
}): void => {
          const eventId = data?.eventId

          // Identificar usuário no TikTok (melhora EMQ)
          if (data?.email || data?.phone || data?.userId) {
                      identifyTikTokUser({
                                    email: data?.email,
                                    phone: data?.phone,
                                    externalId: data?.userId,
                      })
          }

          trackMetaEvent(
                      'InitiateCheckout',
                      data
                        ? {
                                          value: data.value,
                                          currency: data.currency,
                                          content_name: data.content_name,
                                          content_ids: data.content_ids,
                                          num_items: data.num_items,
                        }
                        : undefined,
                      eventId,
                    )

          // FIX Diagnóstico 2 (Vertical Funnel): disparar AddToCart ANTES de InitiateCheckout
          // O TikTok exige a sequência: ViewContent → AddToCart → InitiateCheckout → CompletePayment
          const contentId = data?.content_ids?.[0] || 'fitgoal_plano'
          trackTikTokEvent('AddToCart', {
                      // FIX: content_id sempre obrigatório com valor não-vazio
                               content_id: contentId,
                      content_type: 'product',
                      content_name: data?.content_name || 'Plano FitGoal',
                      value: data?.value,
                      currency: data?.currency || 'BRL',
                      quantity: data?.num_items || 1,
          })

          trackTikTokEvent('InitiateCheckout', {
                      // FIX: content_id sempre obrigatório com valor não-vazio
                               content_id: contentId,
                      content_name: data?.content_name || 'Plano FitGoal',
                      value: data?.value,
                      currency: data?.currency || 'BRL',
          })
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
          email?: string
          phone?: string
          userId?: string
}): void => {
          const options = data.eventId ? { eventID: data.eventId } : undefined

          // Identificar usuário no TikTok (melhora EMQ)
          if (data.email || data.phone || data.userId) {
                      identifyTikTokUser({
                                    email: data.email,
                                    phone: data.phone,
                                    externalId: data.userId,
                      })
          }

          if (typeof window !== 'undefined' && (window as any).fbq) {
                      ;(window as any).fbq(
                                    'track',
                                    'Purchase',
                              {
                                              value: data.value,
                                              currency: data.currency || 'BRL',
                                              content_name: data.content_name,
                                              content_ids: data.content_ids,
                                              content_type: data.content_type || 'product',
                                              num_items: data.num_items || 1,
                              },
                                    options,
                                  )
          }

          // FIX: content_id sempre obrigatório com valor não-vazio
          trackTikTokEvent('CompletePayment', {
                      content_id: data.content_ids?.[0] || 'fitgoal_plano',
                      content_type: data.content_type || 'product',
                      content_name: data.content_name || 'Plano FitGoal',
                      value: data.value,
                      currency: data.currency || 'BRL',
                      quantity: data.num_items || 1,
          })
}

/** AddToCart - para uso explícito (e-commerce / upsell) */
export const trackAddToCart = (data?: {
          value?: number
          currency?: string
          content_name?: string
          content_ids?: string[]
          content_type?: string
}): void => {
          trackMetaEvent('AddToCart', data)
          // FIX: content_id sempre obrigatório com valor não-vazio
          trackTikTokEvent('AddToCart', {
                      content_id: data?.content_ids?.[0] || 'fitgoal_plano',
                      content_type: data?.content_type || 'product',
                      content_name: data?.content_name || 'Plano FitGoal',
                      value: data?.value,
                      currency: data?.currency || 'BRL',
          })
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
          // FIX: content_id sempre obrigatório com valor não-vazio
          trackTikTokEvent('ViewContent', {
                      content_id: 'fitgoal_planos',
                      content_type: 'product',
                      content_name: 'Planos FitGoal',
          })
}
