import { adminDb } from "@/lib/firebase-admin"
import { NextResponse } from "next/server"
import { populateFoodsDatabase } from "@/lib/populateFoods"

export async function POST(request: Request) {
  try {
    // Check if foods already exist
    const foodsRef = adminDb.collection("foods")
    const snapshot = await foodsRef.limit(1).get()

    if (snapshot.size > 0) {
      return NextResponse.json({ 
        message: "Foods database already populated",
        count: await foodsRef.count().get().then(c => c.data().count)
      })
    }

    // Populate foods
    await populateFoodsDatabase()

    return NextResponse.json({ 
      message: "Foods database populated successfully"
    })
  } catch (error) {
    console.error("[v0] Error initializing foods database:", error)
    return NextResponse.json({ error: "Failed to initialize foods database" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const foodsRef = adminDb.collection("foods")
    const countSnapshot = await foodsRef.count().get()
    const count = countSnapshot.data().count

    return NextResponse.json({ 
      count: count,
      initialized: count > 0
    })
  } catch (error) {
    console.error("[v0] Error checking foods database:", error)
    return NextResponse.json({ error: "Failed to check foods database" }, { status: 500 })
  }
}
