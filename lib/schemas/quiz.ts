import { z } from "zod"

// Base types for Quiz responses
export const QuestionTypeSchema = z.enum([
  "single_choice",
  "multi_choice",
  "number",
  "text",
  "slider",
  "height_weight",
  "date",
])

export type QuestionType = z.infer<typeof QuestionTypeSchema>

// Question option
export const QuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.any(),
  description: z.string().optional(),
})

// Question node config
export const QuestionNodeConfigSchema = z.object({
  type: z.literal("question"),
  questionType: QuestionTypeSchema,
  options: z.array(QuestionOptionSchema).optional(),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
  hint: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
})

// Page node config
export const PageNodeConfigSchema = z.object({
  type: z.literal("page"),
  content: z.string(), // HTML or markdown
  imageUrl: z.string().optional(),
  ctaText: z.string().default("Continuar"),
  ctaType: z.enum(["next", "back", "external"]).default("next"),
  ctaLink: z.string().optional(),
})

// Action node config
export const ActionNodeConfigSchema = z.object({
  type: z.literal("action"),
  actionType: z.enum(["save_lead", "tag_segment", "generate_preview", "send_email"]),
  metadata: z.record(z.any()).optional(),
})

// Result node config
export const ResultNodeConfigSchema = z.object({
  type: z.literal("result"),
  message: z.string(),
  nextAction: z.enum(["checkout", "home", "email_signup"]).optional(),
  redirectUrl: z.string().optional(),
})

// Union of all node configs
export const NodeConfigSchema = z.union([
  QuestionNodeConfigSchema,
  PageNodeConfigSchema,
  ActionNodeConfigSchema,
  ResultNodeConfigSchema,
])

export type NodeConfig = z.infer<typeof NodeConfigSchema>

// Edge condition (routing logic)
export const EdgeConditionSchema = z.object({
  field: z.string(), // nodeKey or special vars like "age", "segment"
  operator: z.enum(["equals", "not_equals", "contains", "gt", "lt", "gte", "lte", "in", "not_in"]),
  value: z.any(), // number, string, array, etc.
})

export type EdgeCondition = z.infer<typeof EdgeConditionSchema>

// Quiz edge (connection between nodes with optional conditions)
export const QuizEdgeSchema = z.object({
  id: z.string().uuid(),
  fromNodeId: z.string().uuid(),
  toNodeId: z.string().uuid(),
  conditions: z.array(EdgeConditionSchema).optional(),
  operator: z.enum(["AND", "OR"]).default("AND"), // how to combine multiple conditions
  priority: z.number().int().default(0), // order of evaluation
  isDefault: z.boolean().default(false), // fallback edge
})

export type QuizEdge = z.infer<typeof QuizEdgeSchema>

// Quiz node
export const QuizNodeSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  key: z.string(), // unique key like "goal", "gender", "experience"
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(["question", "page", "action", "result"]),
  config: NodeConfigSchema,
  orderIndex: z.number().int(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type QuizNode = z.infer<typeof QuizNodeSchema>

// Quiz version
export const QuizVersionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  version: z.number().int(),
  nodes: z.array(QuizNodeSchema),
  edges: z.array(QuizEdgeSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  publishedAt: z.date().optional(),
  publishedBy: z.string().optional(),
})

export type QuizVersion = z.infer<typeof QuizVersionSchema>

// User response to a question
export const QuizResponseSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  versionId: z.string().uuid(),
  nodeKey: z.string(),
  nodeId: z.string().uuid(),
  answer: z.any(), // flexible: string, number, array, object
  timestamp: z.date(),
})

export type QuizResponse = z.infer<typeof QuizResponseSchema>

// Full quiz run
export const QuizRunSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  versionId: z.string().uuid(),
  responses: z.array(QuizResponseSchema),
  currentNodeId: z.string().uuid().optional(),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  score: z.number().optional(),
})

export type QuizRun = z.infer<typeof QuizRunSchema>
