import { adminDb } from "@/lib/firebaseAdmin"
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from "firebase-admin/firestore"
import { QuizVersionSchema, QuizNodeSchema, QuizEdgeSchema } from "@/lib/schemas/quiz"
import { z } from "zod"

// Firestore Collections Structure:
// /quiz-versions/{versionId} -> QuizVersion document
// /quiz-versions/{versionId}/nodes/{nodeId} -> QuizNode document
// /quiz-versions/{versionId}/edges/{edgeId} -> QuizEdge document
// /quiz-runs/{runId} -> QuizRun document with responses

export type QuizVersion = z.infer<typeof QuizVersionSchema>
export type QuizNode = z.infer<typeof QuizNodeSchema>
export type QuizEdge = z.infer<typeof QuizEdgeSchema>

/**
 * Create a new quiz version (draft)
 */
export async function createQuizVersion(data: Omit<QuizVersion, "id" | "createdAt" | "updatedAt">) {
  try {
    const versionRef = doc(collection(adminDb, "quiz-versions"))
    const now = Timestamp.now()

    const versionData: QuizVersion = {
      id: versionRef.id,
      ...data,
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(versionRef, versionData)
    return versionData
  } catch (error) {
    console.error("[v0] Error creating quiz version:", error)
    throw error
  }
}

/**
 * Get quiz version by ID
 */
export async function getQuizVersion(versionId: string) {
  try {
    const docRef = doc(adminDb, "quiz-versions", versionId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return docSnap.data() as QuizVersion
  } catch (error) {
    console.error("[v0] Error getting quiz version:", error)
    throw error
  }
}

/**
 * Get all nodes for a quiz version
 */
export async function getQuizNodes(versionId: string): Promise<QuizNode[]> {
  try {
    const nodesRef = collection(adminDb, `quiz-versions/${versionId}/nodes`)
    const querySnapshot = await getDocs(nodesRef)

    return querySnapshot.docs.map((doc) => doc.data() as QuizNode).sort((a, b) => a.orderIndex - b.orderIndex)
  } catch (error) {
    console.error("[v0] Error getting quiz nodes:", error)
    throw error
  }
}

/**
 * Get all edges for a quiz version
 */
export async function getQuizEdges(versionId: string): Promise<QuizEdge[]> {
  try {
    const edgesRef = collection(adminDb, `quiz-versions/${versionId}/edges`)
    const querySnapshot = await getDocs(edgesRef)

    return querySnapshot.docs.map((doc) => doc.data() as QuizEdge).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
  } catch (error) {
    console.error("[v0] Error getting quiz edges:", error)
    throw error
  }
}

/**
 * Add a node to a quiz version
 */
export async function addQuizNode(versionId: string, nodeData: Omit<QuizNode, "id">) {
  try {
    const nodeRef = doc(collection(adminDb, `quiz-versions/${versionId}/nodes`))
    const node: QuizNode = {
      id: nodeRef.id,
      ...nodeData,
    }

    await setDoc(nodeRef, node)
    return node
  } catch (error) {
    console.error("[v0] Error adding quiz node:", error)
    throw error
  }
}

/**
 * Update a node
 */
export async function updateQuizNode(versionId: string, nodeId: string, updates: Partial<QuizNode>) {
  try {
    const nodeRef = doc(adminDb, `quiz-versions/${versionId}/nodes`, nodeId)
    await updateDoc(nodeRef, updates)
  } catch (error) {
    console.error("[v0] Error updating quiz node:", error)
    throw error
  }
}

/**
 * Add an edge to a quiz version
 */
export async function addQuizEdge(versionId: string, edgeData: Omit<QuizEdge, "id">) {
  try {
    const edgeRef = doc(collection(adminDb, `quiz-versions/${versionId}/edges`))
    const edge: QuizEdge = {
      id: edgeRef.id,
      ...edgeData,
    }

    await setDoc(edgeRef, edge)
    return edge
  } catch (error) {
    console.error("[v0] Error adding quiz edge:", error)
    throw error
  }
}

/**
 * Update an edge
 */
export async function updateQuizEdge(versionId: string, edgeId: string, updates: Partial<QuizEdge>) {
  try {
    const edgeRef = doc(adminDb, `quiz-versions/${versionId}/edges`, edgeId)
    await updateDoc(edgeRef, updates)
  } catch (error) {
    console.error("[v0] Error updating quiz edge:", error)
    throw error
  }
}

/**
 * Publish a quiz version (change status from draft to published)
 */
export async function publishQuizVersion(versionId: string) {
  try {
    const versionRef = doc(adminDb, "quiz-versions", versionId)
    await updateDoc(versionRef, {
      status: "published",
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error("[v0] Error publishing quiz version:", error)
    throw error
  }
}

/**
 * Get published quiz version for a quiz name
 */
export async function getPublishedQuizVersion(quizName: string): Promise<QuizVersion | null> {
  try {
    const versionsRef = collection(adminDb, "quiz-versions")
    const q = query(versionsRef, where("name", "==", quizName), where("status", "==", "published"))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return null
    }

    // Return the most recent published version
    return querySnapshot.docs
      .map((doc) => doc.data() as QuizVersion)
      .sort((a, b) => b.updatedAt.toDate().getTime() - a.updatedAt.toDate().getTime())[0]
  } catch (error) {
    console.error("[v0] Error getting published quiz version:", error)
    throw error
  }
}

/**
 * Create a quiz run (user starts answering the quiz)
 */
export async function createQuizRun(data: {
  versionId: string
  userId: string
  email: string
  startedAt: Timestamp
}) {
  try {
    const runRef = doc(collection(adminDb, "quiz-runs"))
    const runData = {
      id: runRef.id,
      ...data,
      responses: {},
      completedAt: null,
    }

    await setDoc(runRef, runData)
    return runData
  } catch (error) {
    console.error("[v0] Error creating quiz run:", error)
    throw error
  }
}

/**
 * Save a response to a quiz run
 */
export async function saveQuizResponse(runId: string, nodeId: string, response: any) {
  try {
    const runRef = doc(adminDb, "quiz-runs", runId)
    await updateDoc(runRef, {
      [`responses.${nodeId}`]: response,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error("[v0] Error saving quiz response:", error)
    throw error
  }
}

/**
 * Complete a quiz run
 */
export async function completeQuizRun(runId: string) {
  try {
    const runRef = doc(adminDb, "quiz-runs", runId)
    await updateDoc(runRef, {
      completedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error("[v0] Error completing quiz run:", error)
    throw error
  }
}
