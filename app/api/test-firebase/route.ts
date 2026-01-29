import { adminDb } from "@/lib/firebaseAdmin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Testing Firebase connection...")
    console.log("[v0] adminDb type:", typeof adminDb)
    console.log("[v0] adminDb:", adminDb ? "initialized" : "null")

    if (!adminDb) {
      return NextResponse.json(
        {
          status: "error",
          message: "adminDb is null - Firebase Admin SDK not initialized",
          env: {
            hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
          },
        },
        { status: 500 }
      )
    }

    // Teste simples: contar documentos em uma coleção
    const testRef = adminDb.collection("foods")
    const countSnapshot = await testRef.limit(1).get()

    return NextResponse.json({
      status: "success",
      message: "Firebase connection working",
      foodsCount: countSnapshot.size,
    })
  } catch (error) {
    console.error("[v0] Firebase test error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: String(error),
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
