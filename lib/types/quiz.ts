// Types for Quiz Builder UI and Runtime

export interface QuizBuilderState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  isDragging: boolean
  zoom: number
  pan: { x: number; y: number }
}

export interface NodePosition {
  x: number
  y: number
}

export interface QuizBuilderNode {
  id: string
  position: NodePosition
  data: {
    title: string
    type: "question" | "page" | "action" | "result"
    isSelected: boolean
  }
}

export interface QuizBuilderEdge {
  id: string
  source: string
  target: string
  label?: string
  animated?: boolean
  data?: {
    conditions?: Array<{
      field: string
      operator: string
      value: any
    }>
  }
}

// Validation errors
export interface ValidationError {
  nodeId?: string
  edgeId?: string
  message: string
  severity: "error" | "warning"
}

// API Request/Response types
export interface SaveDraftRequest {
  versionId: string
  nodes: any[]
  edges: any[]
}

export interface PublishRequest {
  versionId: string
  nodes: any[]
  edges: any[]
  changelog?: string
}

export interface PublishResponse {
  success: boolean
  newVersion: number
  publishedAt: string
}

export interface RollbackRequest {
  versionId: string
  targetVersion: number
}

// Runtime evaluation context
export interface QuizContext {
  leadId: string
  versionId: string
  responses: Map<string, any>
  currentNodeId: string
  history: string[] // nodeIds visited
}

// Audit log
export interface AuditLog {
  id: string
  actorId: string
  action: "create" | "update" | "delete" | "publish" | "rollback"
  entityType: "quiz_node" | "quiz_edge" | "quiz_version"
  entityId: string
  changes: Record<string, any>
  createdAt: Date
}
