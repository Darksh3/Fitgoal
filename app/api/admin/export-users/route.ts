import { NextRequest, NextResponse } from "next/server"
import * as admin from "firebase-admin"
import { getFirebaseAdmin } from "@/lib/firebaseAdmin"
import { verifyAdminToken } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = getFirebaseAdmin().firestore()

    // Buscar todos os users com informações do quiz
    const usersSnapshot = await adminDb.collection("users").get()
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        uid: doc.id,
        email: data.email || "",
        name: data.name || "",
        age: data.age || "",
        gender: data.gender || "",
        currentWeight: data.currentWeight || "",
        targetWeight: data.targetWeight || "",
        goal: data.goal || "",
        createdAt: data.createdAt || "",
        planExpiresAt: data.planExpiresAt || "",
        planDaysRemaining: data.planDaysRemaining || 0,
        isBlocked: data.isBlocked || false,
        daysInApp: data.createdAt 
          ? Math.floor((Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("[v0] ERROR fetching users export:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
