import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { adminDb } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      console.error("[v0] CHECK_ORDER_BUMPS - userId ausente")
      return NextResponse.json({ error: "userId ausente" }, { status: 400 })
    }

    console.log("[v0] CHECK_ORDER_BUMPS - Verificando order bumps do usuário:", userId)

    // Buscar o documento do usuário no Firestore
    try {
      const userDocRef = adminDb.collection("users").doc(userId)
      console.log("[v0] CHECK_ORDER_BUMPS - Tentando acessar documento do usuário")
      
      const userDocSnap = await userDocRef.get()
      console.log("[v0] CHECK_ORDER_BUMPS - Documento recuperado, existe:", userDocSnap.exists)

      if (!userDocSnap.exists) {
        console.warn("[v0] CHECK_ORDER_BUMPS - Usuário não encontrado:", userId)
        return NextResponse.json({ 
          ebook: false, 
          protocolo: false 
        })
      }

      const userData = userDocSnap.data() || {}
      
      // Verificar se tem orderBumps no documento do usuário
      const purchasedBumps = userData.orderBumps || {}
      
      console.log("[v0] CHECK_ORDER_BUMPS - Bumps encontrados:", purchasedBumps)

      return NextResponse.json({
        ebook: purchasedBumps.ebook === true,
        protocolo: purchasedBumps.protocolo === true,
        allBumps: purchasedBumps
      })
    } catch (firestoreError) {
      console.error("[v0] CHECK_ORDER_BUMPS - Erro ao acessar Firestore:", firestoreError)
      throw firestoreError
    }
  } catch (error: any) {
    console.error("[v0] CHECK_ORDER_BUMPS - Erro completo:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    })
    return NextResponse.json({ 
      error: "Erro ao verificar order bumps",
      details: error?.message 
    }, { status: 500 })
  }
}
