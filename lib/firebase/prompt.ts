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
  orderBy,
  limit,
} from "firebase-admin/firestore"
import { PromptTemplate, PromptFixture, PromptTestResult, PromptUsageLog, AuditLog } from "@/lib/schemas/prompt"

// Prompt Template Operations
export async function createPromptTemplate(data: Omit<PromptTemplate, "id">) {
  try {
    const templateRef = doc(collection(adminDb, "prompt-templates"))
    const template: PromptTemplate = {
      id: templateRef.id,
      ...data,
    }
    await setDoc(templateRef, template)
    return template
  } catch (error) {
    console.error("[v0] Error creating prompt template:", error)
    throw error
  }
}

export async function getPromptTemplate(id: string): Promise<PromptTemplate | null> {
  try {
    const docRef = doc(adminDb, "prompt-templates", id)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as PromptTemplate) : null
  } catch (error) {
    console.error("[v0] Error getting prompt template:", error)
    throw error
  }
}

export async function getPromptByKey(key: string, status: "published" | "draft" = "published"): Promise<PromptTemplate | null> {
  try {
    const templatesRef = collection(adminDb, "prompt-templates")
    const q = query(templatesRef, where("key", "==", key), where("status", "==", status), orderBy("version", "desc"), limit(1))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.length > 0 ? (querySnapshot.docs[0].data() as PromptTemplate) : null
  } catch (error) {
    console.error("[v0] Error getting prompt by key:", error)
    throw error
  }
}

export async function listPromptTemplates(category?: string, status?: string) {
  try {
    const templatesRef = collection(adminDb, "prompt-templates")
    let q

    if (category && status) {
      q = query(templatesRef, where("category", "==", category), where("status", "==", status))
    } else if (category) {
      q = query(templatesRef, where("category", "==", category))
    } else if (status) {
      q = query(templatesRef, where("status", "==", status))
    } else {
      q = query(templatesRef)
    }

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as PromptTemplate)
  } catch (error) {
    console.error("[v0] Error listing prompt templates:", error)
    throw error
  }
}

export async function updatePromptTemplate(id: string, updates: Partial<PromptTemplate>) {
  try {
    const templateRef = doc(adminDb, "prompt-templates", id)
    await updateDoc(templateRef, {
      ...updates,
      updated_at: Timestamp.now(),
    })
  } catch (error) {
    console.error("[v0] Error updating prompt template:", error)
    throw error
  }
}

export async function publishPromptTemplate(id: string, publishedBy: string) {
  try {
    const templateRef = doc(adminDb, "prompt-templates", id)
    await updateDoc(templateRef, {
      status: "published",
      published_at: Timestamp.now(),
      published_by: publishedBy,
    })
  } catch (error) {
    console.error("[v0] Error publishing prompt template:", error)
    throw error
  }
}

// Prompt Fixture Operations
export async function createPromptFixture(data: Omit<PromptFixture, "id">) {
  try {
    const fixtureRef = doc(collection(adminDb, "prompt-fixtures"))
    const fixture: PromptFixture = {
      id: fixtureRef.id,
      ...data,
    }
    await setDoc(fixtureRef, fixture)
    return fixture
  } catch (error) {
    console.error("[v0] Error creating prompt fixture:", error)
    throw error
  }
}

export async function getFixturesByPromptKey(promptKey: string) {
  try {
    const fixturesRef = collection(adminDb, "prompt-fixtures")
    const q = query(fixturesRef, where("prompt_key", "==", promptKey))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as PromptFixture)
  } catch (error) {
    console.error("[v0] Error getting fixtures by prompt key:", error)
    throw error
  }
}

// Prompt Test Result Operations
export async function savePromptTestResult(data: Omit<PromptTestResult, "id">) {
  try {
    const resultRef = doc(collection(adminDb, "prompt-test-results"))
    const result: PromptTestResult = {
      id: resultRef.id,
      ...data,
    }
    await setDoc(resultRef, result)
    return result
  } catch (error) {
    console.error("[v0] Error saving prompt test result:", error)
    throw error
  }
}

// Prompt Usage Log Operations
export async function logPromptUsage(data: Omit<PromptUsageLog, "id">) {
  try {
    const logRef = doc(collection(adminDb, "prompt-usage-logs"))
    const log: PromptUsageLog = {
      id: logRef.id,
      ...data,
    }
    await setDoc(logRef, log)
    return log
  } catch (error) {
    console.error("[v0] Error logging prompt usage:", error)
    throw error
  }
}

export async function getPromptUsageLogs(promptKey: string, days: number = 7) {
  try {
    const logsRef = collection(adminDb, "prompt-usage-logs")
    const sevenDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const q = query(
      logsRef,
      where("prompt_key", "==", promptKey),
      where("created_at", ">=", Timestamp.fromDate(sevenDaysAgo)),
      orderBy("created_at", "desc")
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as PromptUsageLog)
  } catch (error) {
    console.error("[v0] Error getting prompt usage logs:", error)
    throw error
  }
}

// Audit Log Operations
export async function createAuditLog(data: Omit<AuditLog, "id">) {
  try {
    const logRef = doc(collection(adminDb, "audit-logs"))
    const log: AuditLog = {
      id: logRef.id,
      ...data,
    }
    await setDoc(logRef, log)
    return log
  } catch (error) {
    console.error("[v0] Error creating audit log:", error)
    throw error
  }
}

export async function getAuditLogsByEntity(entityType: string, entityId: string) {
  try {
    const logsRef = collection(adminDb, "audit-logs")
    const q = query(logsRef, where("entity_type", "==", entityType), where("entity_id", "==", entityId), orderBy("created_at", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => doc.data() as AuditLog)
  } catch (error) {
    console.error("[v0] Error getting audit logs:", error)
    throw error
  }
}
