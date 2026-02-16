import { QuizRun } from '@/lib/schemas/quiz'

export interface FunnelStep {
  nodeId: string
  nodeTitle: string
  startCount: number
  completeCount: number
  dropOffCount: number
  dropOffRate: number
  order: number
}

export interface AnalyticsMetrics {
  totalRuns: number
  completedRuns: number
  completionRate: number
  averageTimePerQuestion: number
  averageQuestionsPerRun: number
  funnel: FunnelStep[]
  mostDroppedQuestions: string[]
  responseDistribution: Record<string, Record<string, number>>
}

/**
 * Calculate funnel metrics from quiz runs
 */
export function calculateFunnelMetrics(runs: QuizRun[]): FunnelStep[] {
  const stepsData: Record<string, { starts: number; completes: number }> = {}

  runs.forEach((run) => {
    const visitedNodes = Object.keys(run.responses || {})
    
    visitedNodes.forEach((nodeId, index) => {
      if (!stepsData[nodeId]) {
        stepsData[nodeId] = { starts: 0, completes: 0 }
      }
      stepsData[nodeId].starts++

      // If this is the last visited node, count as complete for this step
      if (index === visitedNodes.length - 1) {
        stepsData[nodeId].completes++
      }
    })
  })

  // Convert to funnel steps
  const funnelSteps: FunnelStep[] = Object.entries(stepsData).map(
    ([nodeId, data], index) => ({
      nodeId,
      nodeTitle: `Step ${index + 1}`,
      startCount: data.starts,
      completeCount: data.completes,
      dropOffCount: data.starts - data.completes,
      dropOffRate: data.starts > 0 ? ((data.starts - data.completes) / data.starts) * 100 : 0,
      order: index,
    })
  )

  return funnelSteps.sort((a, b) => a.order - b.order)
}

/**
 * Calculate overall analytics metrics
 */
export function calculateAnalyticsMetrics(runs: QuizRun[]): AnalyticsMetrics {
  const completedRuns = runs.filter((r) => r.completedAt).length
  const completionRate = runs.length > 0 ? (completedRuns / runs.length) * 100 : 0

  // Calculate drop-off by question
  const questionDropoffs: Record<string, number> = {}
  runs.forEach((run) => {
    const visitedCount = Object.keys(run.responses || {}).length
    if (!run.completedAt) {
      // This run didn't complete, so the last question caused drop-off
      const lastQuestion = Object.keys(run.responses || {}).pop()
      if (lastQuestion) {
        questionDropoffs[lastQuestion] = (questionDropoffs[lastQuestion] || 0) + 1
      }
    }
  })

  const mostDroppedQuestions = Object.entries(questionDropoffs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([q]) => q)

  // Calculate response distribution
  const responseDistribution: Record<string, Record<string, number>> = {}
  runs.forEach((run) => {
    Object.entries(run.responses || {}).forEach(([nodeId, response]) => {
      if (!responseDistribution[nodeId]) {
        responseDistribution[nodeId] = {}
      }
      const responseStr = String(response)
      responseDistribution[nodeId][responseStr] =
        (responseDistribution[nodeId][responseStr] || 0) + 1
    })
  })

  return {
    totalRuns: runs.length,
    completedRuns,
    completionRate,
    averageTimePerQuestion: 0, // Would need timestamp data
    averageQuestionsPerRun:
      runs.length > 0
        ? runs.reduce((sum, r) => sum + Object.keys(r.responses || {}).length, 0) / runs.length
        : 0,
    funnel: calculateFunnelMetrics(runs),
    mostDroppedQuestions,
    responseDistribution,
  }
}

/**
 * Segment analytics by date range
 */
export function segmentByDateRange(
  runs: QuizRun[],
  startDate: Date,
  endDate: Date
): QuizRun[] {
  return runs.filter((run) => {
    const runDate = new Date(run.createdAt)
    return runDate >= startDate && runDate <= endDate
  })
}

/**
 * Segment analytics by user property (e.g., source, gender, age)
 */
export function segmentByProperty(
  runs: QuizRun[],
  propertyKey: string,
  propertyValue: any
): QuizRun[] {
  return runs.filter((run) => {
    const metadata = (run as any).metadata || {}
    return metadata[propertyKey] === propertyValue
  })
}
