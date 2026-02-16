/**
 * Event Taxonomy for Fitgoal Admin
 * 
 * All events follow a standard property structure for tracking,
 * analytics, and remarketing integration with Meta/TikTok
 */

export enum EventType {
  // Lead events
  LeadCaptured = "LeadCaptured",
  
  // Quiz events
  QuizStarted = "QuizStarted",
  QuizCompleted = "QuizCompleted",
  ResultsViewed = "ResultsViewed",
  
  // Checkout events
  CheckoutStarted = "CheckoutStarted",
  PaymentCreated = "PaymentCreated",
  Purchase = "Purchase",
  PaymentFailed = "PaymentFailed",
  
  // Plan events
  PlanGenerated = "PlanGenerated",
  PlanOpened = "PlanOpened",
  
  // Refund events
  Refunded = "Refunded",
  Chargeback = "Chargeback",
}

export interface StandardEventProperties {
  // IDs
  leadId: string
  userId?: string
  sessionId: string
  
  // UTM parameters
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  
  // Platform IDs
  fbclid?: string
  ttclid?: string
  referrer?: string
  
  // Quiz snapshot
  goal?: string
  bfRange?: string
  experience?: string
  trainingDays?: number
  
  // Money
  planKey?: string
  value?: number
  currency?: string
  
  // Metadata
  timestamp: string
  landingPath?: string
  
  [key: string]: any
}

export interface EventPayload {
  eventType: EventType
  properties: StandardEventProperties
}

/**
 * Helper to create standard event payload
 */
export function createEvent(
  eventType: EventType,
  leadId: string,
  sessionId: string,
  additionalProps?: Partial<StandardEventProperties>
): EventPayload {
  return {
    eventType,
    properties: {
      leadId,
      sessionId,
      timestamp: new Date().toISOString(),
      ...additionalProps,
    },
  }
}
