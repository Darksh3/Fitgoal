import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

export async function POST(req: Request) {
  try {
    const { limit = 100 } = await req.json()

    // Buscar todos os users com initialWeight = "0" ou não definido
    const usersSnap = await adminDb
      .collection("users")
      .where("initialWeight", "in", ["0", ""])
      .limit(limit)
      .get()

    let updated = 0

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id
      const userData = userDoc.data()

      try {
        // Buscar o lead correspondente
        const leadSnap = await adminDb.collection("leads").doc(userId).get()

        if (!leadSnap.exists) {
          console.log(`[v0] MIGRATE - Lead não encontrado para user: ${userId}`)
          continue
        }

        const leadData = leadSnap.data()
        const leadInitialWeight = leadData?.initialWeight || leadData?.quizData?.initialWeight
        const leadCurrentWeight = leadData?.currentWeight || leadData?.quizData?.currentWeight

        if (!leadInitialWeight && !leadCurrentWeight) {
          console.log(`[v0] MIGRATE - Lead sem pesos: ${userId}`)
          continue
        }

        // Atualizar user com os pesos do lead
        await adminDb.collection("users").doc(userId).set(
          {
            initialWeight: leadInitialWeight || userData.currentWeight || "0",
            currentWeight: leadCurrentWeight || userData.currentWeight || "0",
            quizData: {
              ...userData.quizData,
              initialWeight: leadInitialWeight || userData.currentWeight || "0",
              currentWeight: leadCurrentWeight || userData.currentWeight || "0",
            },
            migratedWeightsAt: new Date().toISOString(),
          },
          { merge: true },
        )

        updated++
        console.log(`[v0] MIGRATE - User atualizado: ${userId}`, {
          initialWeight: leadInitialWeight,
          currentWeight: leadCurrentWeight,
        })
      } catch (err: any) {
        console.error(`[v0] MIGRATE - Erro ao migrar user ${userId}:`, err.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updated} usuários migrados com sucesso`,
      updated,
    })
  } catch (error: any) {
    console.error("[v0] MIGRATE - Erro geral:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    )
  }
}
