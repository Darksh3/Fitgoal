import { db } from "@/lib/firebaseClient"
import { collection, query, where, getDocs, limit, QueryConstraint } from "firebase/firestore"
import { NextResponse } from "next/server"

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
    console.error("Error searching foods:", error)
    return NextResponse.json({ error: "Failed to search foods" }, { status: 500 })
  }
}
