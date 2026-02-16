"use server"

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

// Default prompts for Fitgoal
const DEFAULT_PROMPTS = [
  {
    key: "plan.workout.generate",
    category: "workout",
    name: "Gerar Plano de Treino",
    description: "Gera um plano de treino personalizado baseado nas respostas do quiz",
    template: `Crie um plano de treino personalizado com base nos seguintes dados do usuário:
- Objetivo: {{goal}}
- Nível de experiência: {{experienceLevel}}
- Frequência semanal: {{frequency}}
- Dias disponíveis: {{availableDays}}
- Limitações: {{limitations}}

O plano deve incluir:
1. Aquecimento (5-10 minutos)
2. Série de exercícios principais (com séries, repetições e descanso)
3. Exercícios auxiliares
4. Resfriamento (5 minutos)

Forneça em formato JSON estruturado.`,
  },
  {
    key: "plan.diet.generate",
    category: "diet",
    name: "Gerar Plano Alimentar",
    description: "Gera um plano alimentar personalizado",
    template: `Crie um plano alimentar personalizado com base nos dados:
- Objetivo: {{goal}}
- Restrições alimentares: {{restrictions}}
- Calorias diárias: {{calories}}
- Preferências: {{preferences}}

Inclua:
1. Café da manhã (com macros)
2. Lanches (2)
3. Almoço
4. Lanche pré-treino
5. Jantar
6. Lanche noturno (opcional)

Forneça com informações nutricionais.`,
  },
  {
    key: "plan.workout.adjust",
    category: "workout",
    name: "Ajustar Plano de Treino",
    description: "Ajusta plano existente baseado em feedback",
    template: `Ajuste o plano de treino atual com base no feedback do usuário:
- Feedback: {{feedback}}
- Problema: {{problem}}
- Preferência: {{preference}}

Plano atual: {{currentPlan}}

Mantenha a estrutura mas adapte os exercícios e volume.`,
  },
  {
    key: "plan.diet.adjust",
    category: "diet",
    name: "Ajustar Plano Alimentar",
    description: "Ajusta plano alimentar existente",
    template: `Ajuste o plano alimentar com base no feedback:
- Feedback: {{feedback}}
- Problema: {{problem}}

Plano atual: {{currentPlan}}

Mantenha as calorias mas adapte as refeições.`,
  },
  {
    key: "funnel.upsell",
    category: "funnel",
    name: "Mensagem de Upsell",
    description: "Gera mensagem de upsell personalizada",
    template: `Crie uma mensagem de upsell para {{planType}} baseada no perfil:
- Objetivo: {{goal}}
- Plano atual: {{currentPlan}}
- Benefícios adicionais: {{additionalBenefits}}

A mensagem deve ser breve, persuasiva e focada no valor.`,
  },
  {
    key: "funnel.segmentation",
    category: "segmentation",
    name: "Segmentação de Usuário",
    description: "Segmenta usuário com base em respostas",
    template: `Segmente o usuário com base nas respostas do quiz:
{{quizAnswers}}

Retorne um JSON com:
- segment: tipo de segmento
- persona: descrição da persona
- recommendedPlan: plano recomendado
- churnRisk: risco de churn (1-10)`,
  },
  {
    key: "support.response",
    category: "support",
    name: "Resposta de Suporte",
    description: "Gera resposta de suporte",
    template: `Gere uma resposta de suporte amigável para:
- Pergunta do usuário: {{question}}
- Contexto: {{context}}

A resposta deve ser útil, empática e breve.`,
  },
]

/**
 * Initialize default prompts (run once on admin init)
 */
export async function initializeDefaultPrompts() {
  try {
    const results = []
    for (const prompt of DEFAULT_PROMPTS) {
      try {
        const existing = await promptDb.getPromptByKey(prompt.key)
        if (!existing) {
          const created = await promptDb.createPromptTemplate({
            key: prompt.key,
            category: prompt.category as any,
            name: prompt.name,
            description: prompt.description,
            template_text: prompt.template,
            status: "published",
            version: 1,
            created_at: Timestamp.now(),
            created_by: "system",
            published_at: Timestamp.now(),
            published_by: "system",
          })
          results.push({ key: prompt.key, status: "created", id: created.id })
          console.log("[v0] Created default prompt:", prompt.key)
        } else {
          results.push({ key: prompt.key, status: "exists" })
        }
      } catch (error) {
        results.push({ key: prompt.key, status: "error", error: String(error) })
        console.error("[v0] Error creating default prompt:", prompt.key, error)
      }
    }

    return { success: true, data: results }
  } catch (error) {
    console.error("[v0] Error initializing default prompts:", error)
    return { success: false, error: "Failed to initialize prompts" }
  }
}

