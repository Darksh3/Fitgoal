// ============================================
// lib/tiktok-events-api.ts
// TikTok Events API - Server-Side Tracking
// ============================================

interface TikTokEventData {
  event: string
  event_id?: string
  timestamp?: string
  properties?: {
    value?: number
    currency?: string
    content_id?: string
    content_type?: string
    content_name?: string
    quantity?: number
    order_id?: string
  }
  context?: {
    user?: {
      email?: string
      phone_number?: string
      external_id?: string
    }
    ip?: string
    user_agent?: string
    page?: {
      url?: string
    }
  }
}

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendTikTokServerEvent(eventData: TikTokEventData): Promise<boolean> {
  const pixelCode = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN

  if (!pixelCode || !accessToken) {
    console.warn('[TikTok Events API] Credenciais nao configuradas, pulando evento server-side')
    return false
  }

  const url = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'

  const payload = {
    pixel_code: pixelCode,
    event: eventData.event,
    event_id: eventData.event_id,
    timestamp: eventData.timestamp || new Date().toISOString(),
    properties: eventData.properties || {},
    context: eventData.context || {},
    partner_name: 'TikTok',
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (response.ok && result.code === 0) {
      console.log('[TikTok Events API] Evento "' + eventData.event + '" enviado com sucesso')
      return true
    } else {
      console.error('[TikTok Events API] Erro ao enviar "' + eventData.event + '":', result)
      return false
    }
  } catch (error) {
    console.error('[TikTok Events API] Erro na requisicao:', error)
    return false
  }
}

/**
 * Envia evento de Lead server-side (usar quando o quiz e completado)
 */
export async function sendTikTokLeadEvent(options: {
  email?: string
  phone?: string
  sourceUrl?: string
  clientIp?: string
  userAgent?: string
  eventId?: string
}): Promise<boolean> {
  const context: TikTokEventData['context'] = {
    ip: options.clientIp,
    user_agent: options.userAgent,
    page: { url: options.sourceUrl || 'https://fitgoal.com.br/quiz' },
    user: {},
  }

  if (options.email) context.user!.email = await hashSHA256(options.email)
  if (options.phone) context.user!.phone_number = await hashSHA256(options.phone)

  return sendTikTokServerEvent({
    event: 'SubmitForm',
    event_id: options.eventId || 'lead_' + Date.now(),
    context,
    properties: {
      content_name: 'Quiz FitGoal Completo',
      content_type: 'product',
    },
  })
}

/**
 * Envia evento de Purchase server-side (usar no handle-post-checkout)
 */
export async function sendTikTokPurchaseEvent(options: {
  email?: string
  phone?: string
  value: number
  currency?: string
  planName?: string
  orderId?: string
  sourceUrl?: string
  clientIp?: string
  userAgent?: string
}): Promise<boolean> {
  const context: TikTokEventData['context'] = {
    ip: options.clientIp,
    user_agent: options.userAgent,
    page: { url: options.sourceUrl || 'https://fitgoal.com.br' },
    user: {},
  }

  if (options.email) context.user!.email = await hashSHA256(options.email)
  if (options.phone) context.user!.phone_number = await hashSHA256(options.phone)

  return sendTikTokServerEvent({
    event: 'CompletePayment',
    event_id: 'purchase_' + (options.orderId || Date.now()),
    context,
    properties: {
      value: options.value,
      currency: options.currency || 'BRL',
      content_name: options.planName || 'Plano FitGoal',
      content_type: 'product',
      order_id: options.orderId,
      quantity: 1,
    },
  })
}

/**
 * Envia evento de InitiateCheckout server-side (opcional)
 */
export async function sendTikTokInitiateCheckoutEvent(options: {
  email?: string
  phone?: string
  value?: number
  currency?: string
  planName?: string
  clientIp?: string
  userAgent?: string
  eventId?: string
}): Promise<boolean> {
  const context: TikTokEventData['context'] = {
    ip: options.clientIp,
    user_agent: options.userAgent,
    page: { url: 'https://fitgoal.com.br/planos' },
    user: {},
  }

  if (options.email) context.user!.email = await hashSHA256(options.email)
  if (options.phone) context.user!.phone_number = await hashSHA256(options.phone)

  return sendTikTokServerEvent({
    event: 'InitiateCheckout',
    event_id: options.eventId || 'checkout_' + Date.now(),
    context,
    properties: {
      value: options.value,
      currency: options.currency || 'BRL',
      content_name: options.planName || 'Plano FitGoal',
      content_type: 'product',
      quantity: 1,
    },
  })
}
