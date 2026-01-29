import { db } from "@/lib/firebaseClient"
import { collection, getDocs } from "firebase/firestore"
import { NextResponse } from "next/server"
import { populateFoodsDatabase } from "@/lib/populateFoods"

export async function POST(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
    }

    // Check if foods already exist
    const foodsRef = collection(db, "foods")
    const snapshot = await getDocs(foodsRef)

    if (snapshot.size > 0) {
      return NextResponse.json({ 
        message: "Foods database already populated",
        count: snapshot.size 
      })
    }

    // Populate foods
    await populateFoodsDatabase()

    return NextResponse.json({ 
      message: "Foods database populated successfully",
      count: snapshot.size 
    })
  } catch (error) {
    console.error("Error initializing foods database:", error)
    return NextResponse.json({ error: "Failed to initialize foods database" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
    }

    const foodsRef = collection(db, "foods")
    const snapshot = await getDocs(foodsRef)

    return NextResponse.json({ 
      count: snapshot.size,
      initialized: snapshot.size > 0
    })
  } catch (error) {
    console.error("Error checking foods database:", error)
    return NextResponse.json({ error: "Failed to check foods database" }, { status: 500 })
  }
}
