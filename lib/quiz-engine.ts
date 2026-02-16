import { QuizNode, QuizEdge } from "@/lib/schemas/quiz"

export interface QuizState {
  currentNodeId: string
  responses: Record<string, any>
  visitedNodeIds: string[]
  completedAt?: Date
}

/**
 * Evaluates a condition against user responses
 * Supports: equals, not_equals, contains, greater_than, less_than, in_list
 */
export function evaluateCondition(condition: any, responses: Record<string, any>): boolean {
  if (!condition) return true

  const { field, operator, value } = condition

  if (!field || !(field in responses)) {
    return false
  }

  const fieldValue = responses[field]

  switch (operator) {
    case "equals":
      return fieldValue === value

    case "not_equals":
      return fieldValue !== value

    case "contains":
      return typeof fieldValue === "string" && fieldValue.includes(value)

    case "greater_than":
      return Number(fieldValue) > Number(value)

    case "less_than":
      return Number(fieldValue) < Number(value)

    case "in_list":
      return Array.isArray(value) && value.includes(fieldValue)

    case "includes":
      return Array.isArray(fieldValue) && fieldValue.includes(value)

    default:
      return false
  }
}

/**
 * Find the next node to navigate to based on current node and responses
 * Evaluates edges in priority order and returns the target node ID
 */
export function findNextNode(
  currentNodeId: string,
  edges: QuizEdge[],
  responses: Record<string, any>
): string | null {
  // Get all edges starting from current node, sorted by priority
  const relevantEdges = edges
    .filter((edge) => edge.fromNodeId === currentNodeId)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

  // Find first edge with matching condition
  for (const edge of relevantEdges) {
    if (edge.isDefault) {
      // Default edge always matches (fallback)
      return edge.toNodeId
    }

    if (edge.condition && evaluateCondition(edge.condition, responses)) {
      return edge.toNodeId
    }
  }

  // Return default edge if exists
  const defaultEdge = relevantEdges.find((e) => e.isDefault)
  return defaultEdge?.toNodeId ?? null
}

/**
 * Check if a node is terminal (quiz ends)
 */
export function isTerminalNode(node: QuizNode): boolean {
  return node.type === "result"
}

/**
 * Get the initial node (start of quiz)
 */
export function getInitialNode(nodes: QuizNode[]): QuizNode | null {
  // Find node with key="start" or first question node
  const startNode = nodes.find((n) => n.key === "start")
  if (startNode) return startNode

  const firstQuestion = nodes.find((n) => n.type === "question")
  if (firstQuestion) return firstQuestion

  return nodes[0] ?? null
}

/**
 * Validate quiz structure
 * Checks for common issues: orphaned nodes, no start, multiple results, etc.
 */
export interface QuizValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateQuizStructure(nodes: QuizNode[], edges: QuizEdge[]): QuizValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if we have nodes
  if (nodes.length === 0) {
    errors.push("Quiz must have at least one node")
    return { isValid: false, errors, warnings }
  }

  // Check for start node
  const hasStart = nodes.some((n) => n.key === "start") || nodes.length > 0
  if (!hasStart) {
    errors.push("Quiz must have a start node")
  }

  // Check for at least one result node
  const resultNodes = nodes.filter((n) => n.type === "result")
  if (resultNodes.length === 0) {
    errors.push("Quiz must have at least one result node")
  }

  // Check for orphaned nodes (nodes with no incoming or outgoing edges)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const nodesWithEdges = new Set<string>()

  for (const edge of edges) {
    nodesWithEdges.add(edge.fromNodeId)
    nodesWithEdges.add(edge.toNodeId)
  }

  for (const node of nodes) {
    if (!nodesWithEdges.has(node.id) && node.type !== "question" && node.key !== "start") {
      warnings.push(`Node "${node.title}" (${node.id}) has no connections`)
    }
  }

  // Check for invalid edge references
  for (const edge of edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      errors.push(`Edge references non-existent source node: ${edge.fromNodeId}`)
    }
    if (!nodeIds.has(edge.toNodeId)) {
      errors.push(`Edge references non-existent target node: ${edge.toNodeId}`)
    }
  }

  // Check for circular references (optional but good to warn)
  if (hasCircularReference(nodes, edges)) {
    warnings.push("Quiz has circular references which might cause infinite loops")
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Detect circular references in quiz flow
 */
function hasCircularReference(nodes: QuizNode[], edges: QuizEdge[]): boolean {
  const nodeIds = new Set(nodes.map((n) => n.id))
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const outgoingEdges = edges.filter((e) => e.fromNodeId === nodeId)

    for (const edge of outgoingEdges) {
      const target = edge.toNodeId

      if (!visited.has(target)) {
        if (dfs(target)) return true
      } else if (recursionStack.has(target)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }

  return false
}

/**
 * Execute a quiz flow path (for testing/preview)
 * Returns the path taken through the quiz
 */
export interface QuizPathStep {
  nodeId: string
  nodeType: string
  nodeTitle: string
  response?: any
}

export function simulateQuizPath(
  nodes: QuizNode[],
  edges: QuizEdge[],
  responses: Record<string, any>
): QuizPathStep[] {
  const path: QuizPathStep[] = []
  const visited = new Set<string>()
  const maxSteps = 100 // Prevent infinite loops

  let currentNode = getInitialNode(nodes)
  if (!currentNode) return path

  for (let step = 0; step < maxSteps; step++) {
    if (!currentNode) break
    if (visited.has(currentNode.id)) break

    visited.add(currentNode.id)

    path.push({
      nodeId: currentNode.id,
      nodeType: currentNode.type,
      nodeTitle: currentNode.title,
      response: responses[currentNode.key],
    })

    // Stop if terminal node
    if (isTerminalNode(currentNode)) {
      break
    }

    // Find next node
    const nextNodeId = findNextNode(currentNode.id, edges, responses)
    if (!nextNodeId) break

    currentNode = nodes.find((n) => n.id === nextNodeId) || null
  }

  return path
}
