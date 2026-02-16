import { z } from "zod"
import { Timestamp } from "firebase-admin/firestore"

// Prompt Template Schema
export const PromptTemplateSchema = z.object({
  id: z.string(),
  key: z.string().min(1, "Prompt key is required"),
  category: z.enum(["workout", "diet", "funnel", "support", "segmentation", "followup"]),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  template_text: z.string().min(1, "Template text is required"),
  variables_schema_json: z.record(z.any()).optional(),
  status: z.enum(["draft", "published", "archived"]),
  version: z.number().int().positive(),
  created_at: z.instanceof(Timestamp),
  created_by: z.string(),
  published_at: z.instanceof(Timestamp).nullable(),
  published_by: z.string().nullable(),
  tags: z.array(z.string()).optional(),
})

export type PromptTemplate = z.infer<typeof PromptTemplateSchema>

// Prompt Fixture Schema (test payloads)
export const PromptFixtureSchema = z.object({
  id: z.string(),
  prompt_key: z.string(),
  name: z.string().min(1, "Fixture name is required"),
  description: z.string().optional(),
  payload_json: z.record(z.any()),
  expected_output: z.string().optional(),
  created_at: z.instanceof(Timestamp),
  created_by: z.string(),
})

export type PromptFixture = z.infer<typeof PromptFixtureSchema>

// Prompt Test Result
export const PromptTestResultSchema = z.object({
  id: z.string(),
  prompt_key: z.string(),
  fixture_id: z.string(),
  input_payload: z.record(z.any()),
  output_text: z.string(),
  model: z.string(),
  tokens_used: z.number(),
  latency_ms: z.number(),
  cost_estimated: z.number(),
  status: z.enum(["success", "error"]),
  error_message: z.string().nullable(),
  tested_at: z.instanceof(Timestamp),
  tested_by: z.string(),
})

export type PromptTestResult = z.infer<typeof PromptTestResultSchema>

// Prompt Usage Log
export const PromptUsageLogSchema = z.object({
  id: z.string(),
  prompt_key: z.string(),
  prompt_version: z.number(),
  input_json: z.record(z.any()),
  output_text: z.string(),
  model: z.string(),
  tokens_input: z.number(),
  tokens_output: z.number(),
  latency_ms: z.number(),
  cost_estimated: z.number(),
  status: z.enum(["success", "error", "rate_limited"]),
  error_message: z.string().nullable(),
  user_id: z.string().nullable(),
  lead_id: z.string().nullable(),
  request_id: z.string(),
  created_at: z.instanceof(Timestamp),
})

export type PromptUsageLog = z.infer<typeof PromptUsageLogSchema>

// Audit Log Schema
export const AuditLogSchema = z.object({
  id: z.string(),
  actor_id: z.string(),
  action: z.enum(["create", "update", "publish", "rollback", "delete", "approve"]),
  entity_type: z.enum(["prompt", "fixture", "approval"]),
  entity_id: z.string(),
  changes: z.record(z.any()).optional(),
  reason: z.string().optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.instanceof(Timestamp),
})

export type AuditLog = z.infer<typeof AuditLogSchema>

// RBAC Role Schema
export const UserRoleSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  role: z.enum(["admin", "editor", "viewer"]),
  permissions: z.array(z.enum([
    "prompt:read",
    "prompt:create",
    "prompt:edit",
    "prompt:publish",
    "prompt:delete",
    "prompt:approve",
    "fixture:manage",
    "audit:view",
  ])),
  granted_at: z.instanceof(Timestamp),
  granted_by: z.string(),
})

export type UserRole = z.infer<typeof UserRoleSchema>

// Approval Request Schema
export const ApprovalRequestSchema = z.object({
  id: z.string(),
  prompt_id: z.string(),
  prompt_key: z.string(),
  requested_by: z.string(),
  changes: z.record(z.any()),
  status: z.enum(["pending", "approved", "rejected"]),
  reviewed_by: z.string().nullable(),
  review_comment: z.string().nullable(),
  created_at: z.instanceof(Timestamp),
  reviewed_at: z.instanceof(Timestamp).nullable(),
})

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>
