import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const limit = parseInt(searchParams.get("limit") || "500")

    console.log("[v0] ADMIN_PLANS - Fetching plans from users collection", { userId, limit })

    const plans: any[] = []

    if (userId) {
      // Get specific user's plans
      const userRef = adminDb.collection("users").doc(userId)
      const userDoc = await userRef.get()

      if (userDoc.exists) {
        const userData = userDoc.data()
        if (userData?.dietPlan) {
          plans.push({
            id: `${userId}-dietPlan`,
            userId,
            type: "dietPlan",
            createdAt: userData.dietPlan.createdAt || new Date().toISOString(),
            ...userData.dietPlan,
          })
        }
        if (userData?.workoutPlan) {
          plans.push({
            id: `${userId}-workoutPlan`,
            userId,
            type: "workoutPlan",
            createdAt: userData.workoutPlan.createdAt || new Date().toISOString(),
            ...userData.workoutPlan,
          })
        }
      }
    } else {
      // Get all users' plans
      const usersSnapshot = await adminDb.collection("users").limit(limit).get()

      usersSnapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data()
        const userId = userDoc.id

        if (userData?.dietPlan) {
          plans.push({
            id: `${userId}-dietPlan`,
            userId,
            type: "dietPlan",
            createdAt: userData.dietPlan.createdAt || new Date().toISOString(),
            ...userData.dietPlan,
          })
        }
        if (userData?.workoutPlan) {
          plans.push({
            id: `${userId}-workoutPlan`,
            userId,
            type: "workoutPlan",
            createdAt: userData.workoutPlan.createdAt || new Date().toISOString(),
            ...userData.workoutPlan,
          })
        }
      })
    }

    console.log("[v0] ADMIN_PLANS - Found", plans.length, "plans")

    return NextResponse.json({
      plans: plans.slice(0, limit),
      total: plans.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching plans:", error)
    return NextResponse.json({ error: "Erro ao carregar planos", details: String(error) }, { status: 500 })
  }
}

