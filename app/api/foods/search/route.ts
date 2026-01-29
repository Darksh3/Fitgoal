import { adminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get("q")?.toLowerCase() || ""

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json([])
    }

    // Search in Firestore for foods matching the search term
    const foodsRef = adminDb.collection("foods")
    
    const querySnapshot = await foodsRef
      .where("nameLowercase", ">=", searchTerm)
      .where("nameLowercase", "<=", searchTerm + "\uf8ff")
      .limit(20)
      .get()

    const foods = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }))

    console.log("[v0] Food search results:", { searchTerm, count: foods.length })
    return NextResponse.json(foods)
  } catch (error) {
    console.error("[v0] Error searching foods:", error)
    return NextResponse.json({ error: "Failed to search foods" }, { status: 500 })
  }
}
