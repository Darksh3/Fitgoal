import { QuizNode, QuizEdge } from '@/lib/schemas/quiz'

export interface ValidationError {
  type: 'loop' | 'orphan' | 'missing_start' | 'missing_end' | 'disconnected'
  severity: 'error' | 'warning'
  nodeIds?: string[]
  message: string
}

/**
 * Validates quiz flow structure
 * Checks for: loops, orphan nodes, missing start/end, disconnected components
 */
export function validateQuizFlow(nodes: QuizNode[], edges: QuizEdge[]): ValidationError[] {
  const errors: ValidationError[] = []

  if (nodes.length === 0) {
    errors.push({
      type: 'missing_start',
      severity: 'error',
      message: 'Quiz precisa ter pelo menos um nó',
    })
    return errors
  }

  // Check for start node (first node or explicitly marked)
  const resultNodes = nodes.filter((n) => n.type === 'result')
  if (resultNodes.length === 0) {
    errors.push({
      type: 'missing_end',
      severity: 'error',
      message: 'Quiz precisa ter pelo menos um nó de resultado',
    })
  }

  // Check for orphan nodes (no incoming or outgoing edges)
  const edgeSet = new Set<string>()
  edges.forEach((e) => {
    edgeSet.add(e.fromNodeId)
    edgeSet.add(e.toNodeId)
  })

  const nodeIds = new Set(nodes.map((n) => n.id))
  const orphanNodes: string[] = []

  nodes.forEach((node) => {
    const hasIncoming = edges.some((e) => e.toNodeId === node.id)
    const hasOutgoing = edges.some((e) => e.fromNodeId === node.id)

    // Result nodes don't need outgoing edges
    if (node.type === 'result') {
      if (!hasIncoming && nodes.length > 1) {
        orphanNodes.push(node.id)
      }
    } else if (!hasIncoming && !hasOutgoing && nodes.length > 1) {
      orphanNodes.push(node.id)
    }
  })

  if (orphanNodes.length > 0) {
    errors.push({
      type: 'orphan',
      severity: 'warning',
      nodeIds: orphanNodes,
      message: `${orphanNodes.length} nó(s) desconectado(s) da rede principal`,
    })
  }

  // Check for cycles (loops)
  const cycles = detectCycles(nodes, edges)
  if (cycles.length > 0) {
    cycles.forEach((cycle) => {
      errors.push({
        type: 'loop',
        severity: 'error',
        nodeIds: cycle,
        message: `Ciclo detectado: ${cycle.join(' → ')}`,
      })
    })
  }

  // Check for invalid edge targets
  edges.forEach((edge) => {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      errors.push({
        type: 'disconnected',
        severity: 'error',
        message: `Edge referencia um nó que não existe`,
      })
    }
  })

  return errors
}

/**
 * Detects cycles in the graph using DFS
 */
function detectCycles(nodes: QuizNode[], edges: QuizEdge[]): string[][] {
  const adjacencyList: Record<string, string[]> = {}
  const visited: Set<string> = new Set()
  const recursionStack: Set<string> = new Set()
  const cycles: string[][] = []

  // Build adjacency list
  nodes.forEach((node) => {
    adjacencyList[node.id] = []
  })

  edges.forEach((edge) => {
    adjacencyList[edge.fromNodeId].push(edge.toNodeId)
  })

  // DFS for cycle detection
  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    adjacencyList[nodeId].forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path])
      } else if (recursionStack.has(neighbor)) {
        // Cycle found
        const cycleStart = path.indexOf(neighbor)
        if (cycleStart !== -1) {
          const cycle = [...path.slice(cycleStart), neighbor]
          cycles.push(cycle)
        }
      }
    })

    recursionStack.delete(nodeId)
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id, [])
    }
  })

  return cycles
}

/**
 * Get reachability analysis - which nodes can reach which
 */
export function analyzeReachability(nodes: QuizNode[], edges: QuizEdge[]) {
  const adjacencyList: Record<string, string[]> = {}

  nodes.forEach((node) => {
    adjacencyList[node.id] = []
  })

  edges.forEach((edge) => {
    adjacencyList[edge.fromNodeId].push(edge.toNodeId)
  })

  const reachability: Record<string, Set<string>> = {}

  function dfs(start: string, current: string, visited: Set<string>) {
    if (!reachability[start]) {
      reachability[start] = new Set()
    }

    if (visited.has(current) || !adjacencyList[current]) {
      return
    }

    visited.add(current)
    reachability[start].add(current)

    adjacencyList[current].forEach((neighbor) => {
      dfs(start, neighbor, new Set(visited))
    })
  }

  nodes.forEach((node) => {
    dfs(node.id, node.id, new Set())
  })

  return reachability
}
