import { type NextRequest, NextResponse } from "next/server"
import { adminAuth, adminDb } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log("[v0] API: Loading progress history for user:", userId)

    const photosSnapshot = await adminDb
      .collection("progressPhotos")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get()

    console.log("[v0] API: Found", photosSnapshot.docs.length, "progress photos")

    const photos = photosSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamp to ISO string for JSON serialization
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    return NextResponse.json({ success: true, photos })
  } catch (error) {
    console.error("[v0] API: Error loading progress history:", error)
    return NextResponse.json(
      {
        error: "Erro ao carregar histórico",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
