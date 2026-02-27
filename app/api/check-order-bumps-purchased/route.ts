import { NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { adminDb } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId ausente" }, { status: 400 })
    }

    console.log("[v0] CHECK_ORDER_BUMPS - Verificando order bumps do usuário:", userId)

    // Buscar o documento do usuário no Firestore
    const userDocRef = adminDb.collection("users").doc(userId)
    const userDocSnap = await userDocRef.get()

    if (!userDocSnap.exists()) {
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
  } catch (error) {
    console.error("[v0] CHECK_ORDER_BUMPS - Erro:", error)
    return NextResponse.json({ error: "Erro ao verificar order bumps" }, { status: 500 })
  }
}
