"use server"

import { isAdminRequest } from "@/lib/adminServerVerify"
import {
  createQuizVersion,
  getQuizVersion,
  getQuizNodes,
  getQuizEdges,
  addQuizNode,
  updateQuizNode,
  addQuizEdge,
  updateQuizEdge,
  publishQuizVersion,
  getPublishedQuizVersion,
  createQuizRun,
  saveQuizResponse,
  completeQuizRun,
} from "@/lib/firebase/quiz"
import { QuizVersionSchema, QuizNodeSchema, QuizEdgeSchema } from "@/lib/schemas/quiz"
import { validateQuizStructure } from "@/lib/quiz-engine"

/**
 * Create a new quiz version (draft)
 */
export async function createQuiz(name: string) {
  try {
    const adminAuth = await isAdminRequest()
    if (!adminAuth) {
      return { success: false, error: "Unauthorized" }
    }

    const version = await createQuizVersion({
      name,
      status: "draft",
      createdBy: adminAuth.uid,
    })

    return { success: true, data: version }
  } catch (error) {
    console.error("[v0] Error creating quiz:", error)
    return { success: false, error: "Failed to create quiz" }
  }
}

/**
 * Get quiz version for editing
 */
export async function getQuizForEditing(versionId: string) {
  try {
    const adminAuth = await isAdminRequest()
    if (!adminAuth) {
      return { success: false, error: "Unauthorized" }
    }

    const version = await getQuizVersion(versionId)
    if (!version) {
      return { success: false, error: "Quiz not found" }
    }

    const nodes = await getQuizNodes(versionId)
    const edges = await getQuizEdges(versionId)

    return { success: true, data: { version, nodes, edges } }
  } catch (error) {
    console.error("[v0] Error getting quiz:", error)
    return { success: false, error: "Failed to get quiz" }
  }
}

/**
 * Add a node to a quiz
 */
export async function addNodeToQuiz(versionId: string, nodeData: any) {
  try {
    const adminAuth = await isAdminRequest()
    if (!adminAuth) {
      return { success: false, error: "Unauthorized" }
    }

    // Validate node data
    const validated = QuizNodeSchema.parse(nodeData)

    const node = await addQuizNode(versionId, validated)

    return { success: true, data: node }
  } catch (error) {
    console.error("[v0] Error adding node:", error)
    return { success: false, error: "Failed to add node" }
  }
}

/**
 * Update a node
 */
export async function updateNodeInQuiz(versionId: string, nodeId: string, updates: any) {
  try {
    const adminAuth = await isAdminRequest()
    if (!adminAuth) {
      return { success: false, error: "Unauthorized" }
    }

    await updateQuizNode(versionId, nodeId, updates)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating node:", error)
    return { success: false, error: "Failed to update node" }
  }
}

/**
 * Add an edge (connection) to a quiz
 */
export async function addEdgeToQuiz(versionId: string, edgeData: any) {
  try {
    const adminAuth = await isAdminRequest()
    if (!adminAuth) {
      return { success: false, error: "Unauthorized" }
    }

    // Validate edge data
    const validated = QuizEdgeSchema.parse(edgeData)

    const edge = await addQuizEdge(versionId, validated)

    return { success: true, data: edge }
  } catch (error) {
    console.error("[v0] Error adding edge:", error)
    return { success: false, error: "Failed to add edge" }
  }
}

/**
 * Update an edge
 */
export async function updateEdgeInQuiz(versionId: string, edgeId: string, updates: any) {
  try {
    const adminAuth = await isAdminRequest()
    if (!adminAuth) {
      return { success: false, error: "Unauthorized" }
    }

    await updateQuizEdge(versionId, edgeId, updates)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error updating edge:", error)
    return { success: false, error: "Failed to update edge" }
  }
}

/**
 * Validate and publish a quiz version
 */
export async function publishQuiz(versionId: string) {
  try {
    const adminAuth = await isAdminRequest()
    if (!adminAuth) {
      return { success: false, error: "Unauthorized" }
    }

    // Get current state
    const nodes = await getQuizNodes(versionId)
    const edges = await getQuizEdges(versionId)

    // Validate structure
    const validation = validateQuizStructure(nodes, edges)
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join("; ") }
    }

    // Publish
    await publishQuizVersion(versionId)

    return { success: true, warnings: validation.warnings }
  } catch (error) {
    console.error("[v0] Error publishing quiz:", error)
    return { success: false, error: "Failed to publish quiz" }
  }
}

/**
 * Get published quiz for public use
 */
export async function getPublishedQuiz(quizName: string) {
  try {
    const version = await getPublishedQuizVersion(quizName)
    if (!version) {
      return { success: false, error: "Quiz not found" }
    }

    const nodes = await getQuizNodes(version.id)
    const edges = await getQuizEdges(version.id)

    return { success: true, data: { version, nodes, edges } }
  } catch (error) {
    console.error("[v0] Error getting published quiz:", error)
    return { success: false, error: "Failed to get quiz" }
  }
}

/**
 * Start a quiz run (user begins taking quiz)
 */
export async function startQuizRun(versionId: string, userId: string, email: string) {
  try {
    const run = await createQuizRun({
      versionId,
      userId,
      email,
      startedAt: require("firebase/firestore").Timestamp.now(),
    })

    return { success: true, data: { runId: run.id } }
  } catch (error) {
    console.error("[v0] Error starting quiz run:", error)
    return { success: false, error: "Failed to start quiz" }
  }
}

/**
 * Save a response to a quiz question
 */
export async function submitQuizResponse(runId: string, nodeId: string, response: any) {
  try {
    await saveQuizResponse(runId, nodeId, response)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error saving response:", error)
    return { success: false, error: "Failed to save response" }
  }
}

/**
 * Complete a quiz
 */
export async function finishQuizRun(runId: string) {
  try {
    await completeQuizRun(runId)

    return { success: true }
  } catch (error) {
    console.error("[v0] Error completing quiz:", error)
    return { success: false, error: "Failed to complete quiz" }
  }
}
