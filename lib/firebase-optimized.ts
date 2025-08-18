"use client"

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  limit,
  startAfter,
  type DocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore"
import { app } from "@/lib/firebaseClient"

const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const db = app ? getFirestore(app) : null

// Cached document fetcher
export async function getCachedDoc(collectionName: string, docId: string, cacheKey?: string) {
  if (!db) throw new Error("Firebase not initialized")

  const key = cacheKey || `${collectionName}/${docId}`
  const cached = queryCache.get(key)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const docRef = doc(db, collectionName, docId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    const data = { id: docSnap.id, ...docSnap.data() }
    queryCache.set(key, { data, timestamp: Date.now() })
    return data
  }

  return null
}

// Optimized paginated query
export async function getPaginatedDocs(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  pageSize = 10,
  lastDoc?: DocumentSnapshot,
) {
  if (!db) throw new Error("Firebase not initialized")

  const baseQuery = [...constraints, limit(pageSize)]

  if (lastDoc) {
    baseQuery.push(startAfter(lastDoc))
  }

  const q = query(collection(db, collectionName), ...baseQuery)
  const snapshot = await getDocs(q)

  const docs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  return {
    docs,
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
    hasMore: snapshot.docs.length === pageSize,
  }
}

// Batch operations for better performance
export async function batchGetDocs(collectionName: string, docIds: string[]) {
  if (!db) throw new Error("Firebase not initialized")

  const promises = docIds.map((id) => getCachedDoc(collectionName, id))
  return Promise.all(promises)
}

// Clear cache utility
export function clearQueryCache(pattern?: string) {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key)
      }
    }
  } else {
    queryCache.clear()
  }
}
