import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { EventType, createEvent } from "@/lib/events"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface AsaasPayment {
  id: string
  status: string
  value: number
  netValue?: number
  billingType?: string
  externalReference?: string
  description?: string
  customer?: {
    id: string
    email: string
    name: string
    phone?: string
    cpf?: string
  }
  confirmedDate?: string
}

interface AsaasWebhookPayload {
  event: string
  payment: AsaasPayment
}

/**
 * Asaas Payment Webhook Handler
 * 
 * Receives payment status updates and:
 * 1. Updates payment records in Firestore (quick response)
 * 2. Updates lead/user status based on payment outcome
 * 3. Emits events for remarketing and automations
 * 4. Handles idempotency to prevent duplicate processing
 */

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Payment webhook received from Asaas")
    
    const body: AsaasWebhookPayload = await request.json()
    const { event, payment } = body

    if (!payment?.id || !payment?.status) {
      console.warn("[v0] Invalid webhook payload: missing payment id or status")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    // Quick Firestore update (synchronous)
    try {
      await adminDb.collection("payments").doc(payment.id).set(
        {
          asaasPaymentId: payment.id,
          leadId: payment.externalReference,
          status: payment.status,
          value: payment.value,
          netValue: payment.netValue,
          billingType: payment.billingType,
          customerEmail: payment.customer?.email,
          customerName: payment.customer?.name,
          customerPhone: payment.customer?.phone,
          confirmedDate: payment.confirmedDate,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
      console.log(`[v0] Payment ${payment.id} status updated: ${payment.status}`)
    } catch (error) {
      console.error("[v0] Error updating payment in Firestore:", error)
    }

    // Process payment asynchronously (don't block webhook response)
    if (["CONFIRMED", "RECEIVED", "PENDING", "OVERDUE", "REFUNDED", "CHARGEBACK"].includes(payment.status)) {
      processPaymentBackground(payment).catch((err) => {
        console.error("[v0] Background payment processing error:", err)
      })
    }

    // Return 200 OK immediately
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    // Return 200 to avoid Asaas retrying excessively
    return NextResponse.json({ error: "Processed with errors" }, { status: 200 })
  }
}

/**
 * Background payment processing
 * Handles idempotency, updates lead status, and emits events
 */
async function processPaymentBackground(payment: AsaasPayment) {
  try {
    const leadId = payment.externalReference

    if (!leadId) {
      console.warn("[v0] No leadId (externalReference) provided in payment")
      return
    }

    // Idempotency check: prevent processing same payment twice
    const jobId = `asaas_${payment.id}_${payment.status}`
    const jobRef = adminDb.collection("webhookJobs").doc(jobId)
    const jobSnapshot = await jobRef.get()

    if (jobSnapshot.exists) {
      console.log(`[v0] Payment ${payment.id} already processed, skipping`)
      return
    }

    // Mark as processed
    await jobRef.set({
      paymentId: payment.id,
      leadId,
      status: payment.status,
      createdAt: new Date().toISOString(),
    })

    // Get lead data for context
    const leadRef = adminDb.collection("leads").doc(leadId)
    const leadSnapshot = await leadRef.get()

    if (!leadSnapshot.exists) {
      console.warn(`[v0] Lead ${leadId} not found`)
      return
    }

    const leadData = leadSnapshot.data()
    let newStage = leadData?.stage || "novo"
    let eventType: EventType | null = null

    // Determine new stage and event type based on payment status
    switch (payment.status) {
      case "CONFIRMED":
      case "RECEIVED":
        newStage = "cliente"
        eventType = EventType.Purchase
        break
      case "PENDING":
        newStage = "proposta"
        break
      case "OVERDUE":
        newStage = "perdido"
        eventType = EventType.PaymentFailed
        break
      case "REFUNDED":
        eventType = EventType.Refunded
        break
      case "CHARGEBACK":
        eventType = EventType.Chargeback
        break
    }

    // Update lead status
    await leadRef.update({
      stage: newStage,
      asaasPaymentId: payment.id,
      lastPaymentStatus: payment.status,
      lastPaymentDate: new Date().toISOString(),
      planType: payment.description?.toLowerCase().includes("mensal") ? "mensal" : 
                payment.description?.toLowerCase().includes("trimestral") ? "trimestral" :
                payment.description?.toLowerCase().includes("semestral") ? "semestral" : null,
      subscriptionStatus: newStage === "cliente" ? "active" : "pending",
    })

    console.log(`[v0] Lead ${leadId} updated to stage: ${newStage}`)

    // Emit event for remarketing and automations
    if (eventType) {
      const sessionId = crypto.randomBytes(16).toString("hex")
      const event = createEvent(eventType, leadId, sessionId, {
        value: payment.value,
        currency: "BRL",
        utm_source: leadData.utm_source,
        utm_campaign: leadData.utm_campaign,
        utm_medium: leadData.utm_medium,
        goal: leadData.goal,
        experience: leadData.experience,
      })

      // Save event to events collection
      const eventRef = await adminDb.collection("events").add(event)
      console.log(`[v0] Event ${eventType} emitted for lead ${leadId}`)

      // TODO: Send to Meta CAPI
      // await sendToMetaCAPI(event)

      // TODO: Send to TikTok
      // await sendToTikTok(event)

      // TODO: Trigger email automations
      // await triggerEmailAutomation(eventType, leadId, leadData)
    }

    // Call post-checkout handler if configured
    const appUrl = process.env.APP_URL
    if (appUrl && payment.status === "CONFIRMED") {
      try {
        const response = await fetch(`${appUrl}/api/handle-post-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: leadId,
            paymentId: payment.id,
            customerName: payment.customer?.name || leadData.name,
            customerEmail: payment.customer?.email || leadData.email,
            customerPhone: payment.customer?.phone || leadData.phone,
            value: payment.value,
          }),
        })

        if (!response.ok) {
          console.error(`[v0] Post-checkout handler returned ${response.status}`)
        }
      } catch (error) {
        console.error("[v0] Error calling post-checkout handler:", error)
      }
    }
  } catch (error) {
    console.error("[v0] Background payment processing failed:", error)
    throw error
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: "webhook active" }, { status: 200 })
}
