import * as admin from "firebase-admin"
import { NextResponse } from "next/server"

// Inicializar Firebase Admin
let db: any
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      } as any),
    })
  }
  db = admin.firestore()
} catch (error) {
  console.error("[v0] Firebase Admin initialization error:", error)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get("q")?.toLowerCase() || ""

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json([])
    }

    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
    }

    // Search in Firestore for foods matching the search term
    const foodsRef = db.collection("foods")
    
    const querySnapshot = await foodsRef
      .where("nameLowercase", ">=", searchTerm)
      .where("nameLowercase", "<=", searchTerm + "\uf8ff")
      .limit(20)
      .get()

    const foods = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(foods)
  } catch (error) {
    console.error("[v0] Error searching foods:", error)
    return NextResponse.json({ error: "Failed to search foods" }, { status: 500 })
  }
}
