import { createAgentUIStreamResponse, ToolLoopAgent, tool } from 'ai'
import { z } from 'zod'
import { admin } from '@/lib/firebase-admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { convertToModelMessages } from 'ai'

const adminDb = admin.firestore()

// Tools for the agent
const tools = {
  getLeadsStats: tool({
    description: 'Get summary statistics about leads including total count, stage distribution, and recent leads',
    inputSchema: z.object({
      limit: z.number().optional().default(100).describe('Number of recent leads to include'),
    }),
    execute: async ({ limit }) => {
      const snapshot = await adminDb.collection('leads').limit(limit).get()
      const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      const stageDistribution = leads.reduce(
        (acc, lead) => {
          const stage = lead.stage || 'unknown'
          acc[stage] = (acc[stage] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const avgAge = leads.reduce((sum, l) => sum + (Number(l.age) || 0), 0) / leads.length || 0
      const genderDistribution = leads.reduce(
        (acc, lead) => {
          const gender = lead.gender || 'unknown'
          acc[gender] = (acc[gender] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return {
        totalLeads: snapshot.size,
        averageAge: Math.round(avgAge),
        stageDistribution,
        genderDistribution,
        recentLeads: leads.slice(0, 5).map((l) => ({ name: l.name, email: l.email, stage: l.stage })),
      }
    },
  }),

  getUsersStats: tool({
    description: 'Get summary statistics about users/customers including total count, plans purchased, and revenue metrics',
    inputSchema: z.object({
      limit: z.number().optional().default(100).describe('Number of users to analyze'),
    }),
    execute: async ({ limit }) => {
      const snapshot = await adminDb.collection('users').limit(limit).get()
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      const withPlans = users.filter((u) => u.dietPlan || u.workoutPlan).length
      const avgAge = users.reduce((sum, u) => sum + (Number(u.age) || 0), 0) / users.length || 0

      return {
        totalUsers: snapshot.size,
        usersWithPlans: withPlans,
        averageAge: Math.round(avgAge),
        recentUsers: users.slice(0, 5).map((u) => ({ name: u.name, email: u.email, hasDietPlan: !!u.dietPlan, hasWorkoutPlan: !!u.workoutPlan })),
      }
    },
  }),

  getPaymentsStats: tool({
    description: 'Get payment statistics including total revenue, payment method distribution, and payment status breakdown',
    inputSchema: z.object({
      daysAgo: z.number().optional().default(30).describe('Number of days to look back'),
    }),
    execute: async ({ daysAgo }) => {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - daysAgo)

      const snapshot = await adminDb.collection('payments').where('createdAt', '>=', dateFilter.toISOString()).get()
      const payments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      const statusDistribution = payments.reduce(
        (acc, p) => {
          const status = p.status || 'unknown'
          acc[status] = (acc[status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const methodDistribution = payments.reduce(
        (acc, p) => {
          const method = p.paymentMethod || 'unknown'
          acc[method] = (acc[method] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return {
        totalPayments: snapshot.size,
        totalRevenue: totalRevenue.toFixed(2),
        averageValue: (totalRevenue / payments.length).toFixed(2),
        statusDistribution,
        methodDistribution,
        period: `Last ${daysAgo} days`,
      }
    },
  }),

  searchLeads: tool({
    description: 'Search for leads by name, email, or phone number',
    inputSchema: z.object({
      query: z.string().describe('Search term (name, email, or phone)'),
      limit: z.number().optional().default(10).describe('Maximum results to return'),
    }),
    execute: async ({ query, limit }) => {
      const snapshot = await adminDb.collection('leads').limit(limit * 2).get()
      const leads = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (lead) =>
            lead.name?.toLowerCase().includes(query.toLowerCase()) ||
            lead.email?.toLowerCase().includes(query.toLowerCase()) ||
            lead.phone?.includes(query)
        )
        .slice(0, limit)

      return {
        found: leads.length,
        leads: leads.map((l) => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, stage: l.stage })),
      }
    },
  }),

  exportLeadEmails: tool({
    description: 'Get a list of all lead emails',
    inputSchema: z.object({
      stage: z.string().optional().describe('Filter by lead stage'),
    }),
    execute: async ({ stage }) => {
      let query: any = adminDb.collection('leads')
      if (stage) {
        query = query.where('stage', '==', stage)
      }

      const snapshot = await query.limit(5000).get()
      const leads = snapshot.docs.map((doc) => doc.data())
      const emails = leads.map((l) => l.email).filter(Boolean)

      return {
        totalEmails: emails.length,
        stage: stage || 'all',
        emails: emails.slice(0, 100),
        totalCount: emails.length,
      }
    },
  }),

  getConversionMetrics: tool({
    description: 'Get conversion funnel metrics from leads to customers',
    inputSchema: z.object({}),
    execute: async () => {
      const [leadsSnapshot, usersSnapshot, paymentsSnapshot] = await Promise.all([
        adminDb.collection('leads').get(),
        adminDb.collection('users').get(),
        adminDb.collection('payments').where('status', '==', 'RECEIVED').get(),
      ])

      const totalLeads = leadsSnapshot.size
      const totalUsers = usersSnapshot.size
      const paidUsers = paymentsSnapshot.size

      const conversionLeadToUser = ((totalUsers / totalLeads) * 100).toFixed(2)
      const conversionUserToPaid = ((paidUsers / totalUsers) * 100).toFixed(2) || '0'
      const overallConversion = ((paidUsers / totalLeads) * 100).toFixed(2)

      return {
        totalLeads,
        totalUsers,
        totalPaidUsers: paidUsers,
        conversionLeadToUser: `${conversionLeadToUser}%`,
        conversionUserToPaid: `${conversionUserToPaid}%`,
        overallConversion: `${overallConversion}%`,
      }
    },
  }),
}

const agent = new ToolLoopAgent({
  model: 'openai/gpt-4o',
  instructions: `You are an expert admin assistant for FitGoal. You have access to all business data.
Answer questions about metrics, provide insights, and generate reports.`,
  tools,
})

export async function POST(request: Request) {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages } = await request.json()

    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
    })
  } catch (error) {
    console.error('[v0] Admin agent error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
