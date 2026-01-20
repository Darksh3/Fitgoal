import { adminDb, adminAuth } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    // Segurança: verificar se é uma request válida (pode adicionar autenticação se quiser)
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET_KEY}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    let migratedCount = 0
    let errorCount = 0

    // Buscar todos os usuários em "users"
    const usersSnapshot = await adminDb.collection("users").get()

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data()
        const quizData = userData.quizData

        // Se o usuário tem quizData mas não tem initialWeight setado
        if (quizData && !quizData.initialWeight && quizData.currentWeight) {
          // Setar initialWeight com o valor atual de currentWeight
          await adminDb
            .collection("users")
            .doc(userDoc.id)
            .update({
              "quizData.initialWeight": quizData.currentWeight,
            })

          migratedCount++
          console.log(`[Migration] Updated user ${userDoc.id} with initialWeight: ${quizData.currentWeight}`)
        }
      } catch (error) {
        errorCount++
        console.error(`[Migration Error] User ${userDoc.id}:`, error)
      }
    }

    // Também atualizar a collection "leads" se existir
    let leadsUpdated = 0
    try {
      const leadsSnapshot = await adminDb.collection("leads").get()

      for (const leadDoc of leadsSnapshot.docs) {
        try {
          const leadData = leadDoc.data()
          const quizData = leadData.quizData

          if (quizData && !quizData.initialWeight && quizData.currentWeight) {
            await adminDb
              .collection("leads")
              .doc(leadDoc.id)
              .update({
                "quizData.initialWeight": quizData.currentWeight,
              })

            leadsUpdated++
            console.log(`[Migration] Updated lead ${leadDoc.id} with initialWeight: ${quizData.currentWeight}`)
          }
        } catch (error) {
          errorCount++
          console.error(`[Migration Error] Lead ${leadDoc.id}:`, error)
        }
      }
    } catch (error) {
      console.error("[Migration Error] Failed to process leads collection:", error)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Migration completed",
        usersUpdated: migratedCount,
        leadsUpdated: leadsUpdated,
        errors: errorCount,
      }),
      { status: 200 },
    )
  } catch (error) {
    console.error("[Migration Fatal Error]:", error)
    return new Response(JSON.stringify({ error: "Migration failed", details: String(error) }), {
      status: 500,
    })
  }
}
