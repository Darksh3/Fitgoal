import { getFirestore, collection, query, where, getDocs, limit, QueryConstraint } from "firebase/firestore"
import { initializeApp, getApps, cert } from "firebase-admin"
import { NextResponse } from "next/server"

// Inicializar Firebase Admin
const apps = getApps()
const adminApp = apps.length === 0 ? initializeApp(
  {
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    } as any),
  },
) : apps[0]

const db = getFirestore(adminApp)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get("q")?.toLowerCase() || ""

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json([])
    }

    // Search in Firestore for foods matching the search term
    const foodsRef = collection(db, "foods")
    
    // Create query constraints
    const constraints: QueryConstraint[] = [
      where("nameLowercase", ">=", searchTerm),
      where("nameLowercase", "<=", searchTerm + "\uf8ff"),
      limit(20),
    ]

    const q = query(foodsRef, ...constraints)
    const querySnapshot = await getDocs(q)

    const foods = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(foods)
  } catch (error) {
    console.error("[v0] Error searching foods:", error)
    return NextResponse.json({ error: "Failed to search foods" }, { status: 500 })
  }
}
