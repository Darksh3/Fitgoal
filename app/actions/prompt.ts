import { z } from "zod"
import { PromptTemplateSchema, PromptFixtureSchema } from "@/lib/schemas/prompt"
import * as promptDb from "@/lib/firebase/prompt"
import { Timestamp } from "firebase-admin/firestore"

// Get all prompts for the Prompt Studio
export async function getPromptsList(category?: string, status?: string) {
  try {
    const templates = await promptDb.listPromptTemplates(category, status)
    return {
      success: true,
      data: templates,
    }
  } catch (error) {
    console.error("[v0] Error getting prompts list:", error)
    return {
      success: false,
      error: "Failed to fetch prompts",
    }
  }
}

// Get single prompt for editing
export async function getPromptForEditing(id: string) {
  try {
    const template = await promptDb.getPromptTemplate(id)
    if (!template) {
      return { success: false, error: "Prompt not found" }
    }

    const fixtures = await promptDb.getFixturesByPromptKey(template.key)
    const auditLogs = await promptDb.getAuditLogsByEntity("prompt", id)

    return {
      success: true,
      data: {
        template,
        fixtures,
        auditLogs,
      },
    }
  } catch (error) {
    console.error("[v0] Error getting prompt for editing:", error)
    return { success: false, error: "Failed to fetch prompt" }
  }
}

// Save prompt draft
export async function savePromptDraft(id: string | null, data: Partial<z.infer<typeof PromptTemplateSchema>>, userId: string) {
  try {
    if (!data.key || !data.template_text) {
      return { success: false, error: "Key and template text are required" }
    }

    let promptId = id
    if (!promptId) {
      // Create new draft
      const newPrompt = await promptDb.createPromptTemplate({
        key: data.key,
        name: data.name || data.key,
        category: data.category || "support",
        description: data.description,
        template_text: data.template_text,
        variables_schema_json: data.variables_schema_json,
        status: "draft",
        version: 1,
        created_at: Timestamp.now(),
        created_by: userId,
        published_at: null,
        published_by: null,
      })
      promptId = newPrompt.id

      // Create audit log
      await promptDb.createAuditLog({
        actor_id: userId,
        action: "create",
        entity_type: "prompt",
        entity_id: promptId,
        created_at: Timestamp.now(),
      })
    } else {
      // Update existing draft
      await promptDb.updatePromptTemplate(promptId, {
        ...data,
      })

      await promptDb.createAuditLog({
        actor_id: userId,
        action: "update",
        entity_type: "prompt",
        entity_id: promptId,
        changes: data,
        created_at: Timestamp.now(),
      })
    }

    const updated = await promptDb.getPromptTemplate(promptId)
    return { success: true, data: updated }
  } catch (error) {
    console.error("[v0] Error saving prompt draft:", error)
    return { success: false, error: "Failed to save prompt" }
  }
}

// Publish prompt
export async function publishPrompt(id: string, userId: string) {
  try {
    await promptDb.publishPromptTemplate(id, userId)

    await promptDb.createAuditLog({
      actor_id: userId,
      action: "publish",
      entity_type: "prompt",
      entity_id: id,
      created_at: Timestamp.now(),
    })

    const updated = await promptDb.getPromptTemplate(id)
    return { success: true, data: updated }
  } catch (error) {
    console.error("[v0] Error publishing prompt:", error)
    return { success: false, error: "Failed to publish prompt" }
  }
}

// Create fixture
export async function createFixture(promptKey: string, data: Omit<z.infer<typeof PromptFixtureSchema>, "id">, userId: string) {
  try {
    const fixture = await promptDb.createPromptFixture({
      ...data,
      prompt_key: promptKey,
      created_at: Timestamp.now(),
      created_by: userId,
    })

    return { success: true, data: fixture }
  } catch (error) {
    console.error("[v0] Error creating fixture:", error)
    return { success: false, error: "Failed to create fixture" }
  }
}

// Get audit history
export async function getPromptHistory(promptId: string) {
  try {
    const logs = await promptDb.getAuditLogsByEntity("prompt", promptId)
    return { success: true, data: logs }
  } catch (error) {
    console.error("[v0] Error getting audit history:", error)
    return { success: false, error: "Failed to fetch history" }
  }
}

// Get usage metrics
export async function getPromptUsageMetrics(promptKey: string, days: number = 7) {
  try {
    const logs = await promptDb.getPromptUsageLogs(promptKey, days)
    
    const metrics = {
      total_calls: logs.length,
      success_rate: (logs.filter(l => l.status === "success").length / logs.length * 100).toFixed(2),
      avg_latency_ms: (logs.reduce((sum, l) => sum + l.latency_ms, 0) / logs.length).toFixed(2),
      total_tokens: logs.reduce((sum, l) => sum + l.tokens_input + l.tokens_output, 0),
      estimated_cost: logs.reduce((sum, l) => sum + l.cost_estimated, 0).toFixed(4),
      errors: logs.filter(l => l.status === "error").length,
    }

    return { success: true, data: { metrics, logs } }
  } catch (error) {
    console.error("[v0] Error getting usage metrics:", error)
    return { success: false, error: "Failed to fetch metrics" }
  }
}
