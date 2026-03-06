interface ServerEventData {
  event_name: string
  event_time?: number
  event_source_url?: string
  user_data?: {
    em?: string
    ph?: string
    fn?: string
    ln?: string
    client_ip_address?: string
    client_user_agent?: string
    fbc?: string
    fbp?: string
    external_id?: string
  }
  custom_data?: {
    value?: number
    currency?: string
    content_name?: string
    content_ids?: string[]
    content_type?: string
    num_items?: number
    order_id?: string
  }
  action_source?: string
}

async function hashSHA256(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(value.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendMetaServerEvent(eventData: ServerEventData): Promise<boolean> {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('[Meta CAPI] Credenciais não configuradas, pulando evento server-side')
    return false
  }

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events`

  const payload = {
    data: [
      {
        event_name: eventData.event_name,
        event_time: eventData.event_time || Math.floor(Date.now() / 1000),
        event_source_url: eventData.event_source_url,
        action_source: eventData.action_source || 'website',
        user_data: eventData.user_data || {},
        custom_data: eventData.custom_data || {},
      },
    ],
  }

  try {
    const response = await fetch(`${url}?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (response.ok) {
      console.log(`[Meta CAPI] Evento "${eventData.event_name}" enviado com sucesso`)
      return true
    } else {
      console.error(`[Meta CAPI] Erro ao enviar "${eventData.event_name}":`, result)
      return false
    }
  } catch (error) {
    console.error('[Meta CAPI] Erro na requisição:', error)
    return false
  }
}

/**
 * Envia evento de Lead server-side (usar quando saveLead é bem-sucedido)
 */
export async function sendLeadEvent(options: {
  email?: string
  phone?: string
  firstName?: string
  sourceUrl?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
}): Promise<boolean> {
  const userData: ServerEventData['user_data'] = {
    client_ip_address: options.clientIp,
    client_user_agent: options.userAgent,
    fbc: options.fbc,
    fbp: options.fbp,
  }

  if (options.email) userData.em = await hashSHA256(options.email)
  if (options.phone) userData.ph = await hashSHA256(options.phone)
  if (options.firstName) userData.fn = await hashSHA256(options.firstName)

  return sendMetaServerEvent({
    event_name: 'Lead',
    event_source_url: options.sourceUrl || 'https://fitgoal.com.br/quiz',
    user_data: userData,
    custom_data: {
      content_name: 'Quiz FitGoal Completo',
    },
  })
}

/**
 * Envia evento de Purchase server-side (usar no handle-post-checkout)
 */
export async function sendPurchaseEvent(options: {
  email?: string
  phone?: string
  value: number
  currency?: string
  planName?: string
  orderId?: string
  sourceUrl?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
}): Promise<boolean> {
  const userData: ServerEventData['user_data'] = {
    client_ip_address: options.clientIp,
    client_user_agent: options.userAgent,
    fbc: options.fbc,
    fbp: options.fbp,
  }

  if (options.email) userData.em = await hashSHA256(options.email)
  if (options.phone) userData.ph = await hashSHA256(options.phone)

  return sendMetaServerEvent({
    event_name: 'Purchase',
    event_source_url: options.sourceUrl || 'https://fitgoal.com.br',
    user_data: userData,
    custom_data: {
      value: options.value,
      currency: options.currency || 'BRL',
      content_name: options.planName || 'Plano FitGoal',
      content_type: 'product',
      order_id: options.orderId,
      num_items: 1,
    },
  })
}
