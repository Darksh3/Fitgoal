import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paymentId, status } = body

    console.log("[v0] TEST_FIRESTORE - Testando escrita no Firestore")
    console.log("[v0] TEST_FIRESTORE - paymentId:", paymentId)
    console.log("[v0] TEST_FIRESTORE - status:", status)

    // Tentar escrever no Firestore
    await adminDb.collection("payments").doc(paymentId).set({
      paymentId,
      status,
      testTimestamp: new Date(),
      test: true,
    }, { merge: true })

    console.log("[v0] TEST_FIRESTORE_SUCCESS - Escrita bem-sucedida!")

    // Tentar ler o documento
    const doc = await adminDb.collection("payments").doc(paymentId).get()
    const data = doc.data()

    console.log("[v0] TEST_FIRESTORE_READ - Documento lido:", data)

    return NextResponse.json({ 
      success: true, 
      message: "Firestore test bem-sucedido",
      data,
    }, { status: 200 })
  } catch (error: any) {
    console.error("[v0] TEST_FIRESTORE_ERROR - Erro:", error.message)
    return NextResponse.json({ 
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
