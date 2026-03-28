import { NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function POST(request: Request) {
      const isAdmin = await isAdminRequest()
      if (!isAdmin) {
              return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
      }

  try {
          const { email, action } = await request.json()

        if (!email) {
                  return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
        }

        // ── 1. Buscar lead pelo email ────────────────────────────────────────────────
        const leadsSnap = await adminDb
            .collection("leads")
            .where("email", "==", email.toLowerCase().trim())
            .limit(1)
            .get()

        if (leadsSnap.empty) {
                  return NextResponse.json(
                      { error: "Nenhum lead encontrado com esse email" },
                      { status: 404 }
                            )
        }

        const leadDoc = leadsSnap.docs[0]
          const leadId = leadDoc.id
          const leadData = leadDoc.data()

        // Se for apenas busca de dados do lead, retorna aqui
        if (action === "lookup") {
                  return NextResponse.json({
                              found: true,
                              leadId,
                              email: leadData.email,
                              name: leadData.name || leadData.firstName || null,
                              quizData: {
                                            goal: leadData.goal,
                                            weight: leadData.weight,
                                            height: leadData.height,
                                            age: leadData.age,
                                            gender: leadData.gender,
                                            activityLevel: leadData.activityLevel,
                                            workoutTime: leadData.workoutTime,
                                            workoutDays: leadData.workoutDays,
                                            workoutLocation: leadData.workoutLocation,
                                            dietaryRestrictions: leadData.dietaryRestrictions,
                                            targetWeight: leadData.targetWeight,
                                            fitnessLevel: leadData.fitnessLevel,
                              },
                              hasPaid: leadData.hasPaid || false,
                              hasTrialActivated: leadData.hasTrialActivated || false,
                  })
        }

        // ── 2. Ativar trial ──────────────────────────────────────────────────────────
        if (action !== "activate") {
                  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
        }

        const cleanEmail = (leadData.email || email).toLowerCase().trim()
          const trialExpirationDate = new Date()
          trialExpirationDate.setDate(trialExpirationDate.getDate() + 15)

        // ── 3. Criar ou buscar usuário no Firebase Auth ──────────────────────────────
        let userId: string
          let firebaseUser: any = null
          let isNewUser = false

        const tempPassword =
                  Math.random().toString(36).slice(-8) +
                  Math.random().toString(36).slice(-4).toUpperCase() +
                  "!"

        try {
                  // Tenta buscar usuário existente pelo email
            firebaseUser = await auth.getUserByEmail(cleanEmail)
                  userId = firebaseUser.uid
                  isNewUser = false
        } catch (getUserError: any) {
                  // Só cria se o erro for "user not found"
            if (
                        getUserError?.code === "auth/user-not-found" ||
                        getUserError?.errorInfo?.code === "auth/user-not-found"
                      ) {
                        try {
                                      firebaseUser = await auth.createUser({
                                                      uid: leadId,
                                                      email: cleanEmail,
                                                      password: tempPassword,
                                                      displayName:
                                                                        leadData.name || leadData.firstName || cleanEmail.split("@")[0],
                                                      emailVerified: false,
                                      })
                                      userId = firebaseUser.uid
                                      isNewUser = true
                        } catch (createError: any) {
                                      // Se uid já existe, busca pelo uid diretamente
                          if (
                                          createError?.code === "auth/uid-already-exists" ||
                                          createError?.errorInfo?.code === "auth/uid-already-exists"
                                        ) {
                                          firebaseUser = await auth.getUser(leadId)
                                          userId = firebaseUser.uid
                                          isNewUser = false
                          } else {
                                          throw createError
                          }
                        }
            } else {
                        throw getUserError
            }
        }

        // ── 4. Atualizar documento na coleção users ──────────────────────────────────
        await adminDb
            .collection("users")
            .doc(userId)
            .set(
                {
                              uid: userId,
                              email: cleanEmail,
                              name: leadData.name || leadData.firstName || null,
                              subscriptionStatus: "active",
                              plan: "trial",
                              expirationDate: trialExpirationDate.toISOString(),
                              hasPaid: false,
                              trialActivatedBy: "admin",
                              trialActivatedAt: new Date().toISOString(),
                              leadId: leadId,
                              // dados do quiz para geração dos planos
                              goal: leadData.goal || null,
                              weight: leadData.weight || null,
                              height: leadData.height || null,
                              age: leadData.age || null,
                              gender: leadData.gender || null,
                              activityLevel: leadData.activityLevel || null,
                              workoutTime: leadData.workoutTime || null,
                              workoutDays: leadData.workoutDays || null,
                              workoutLocation: leadData.workoutLocation || null,
                              dietaryRestrictions: leadData.dietaryRestrictions || null,
                              targetWeight: leadData.targetWeight || null,
                              fitnessLevel: leadData.fitnessLevel || null,
                },
                { merge: true }
                      )

        // ── 5. Atualizar o lead marcando o trial ─────────────────────────────────────
        await adminDb.collection("leads").doc(leadId).update({
                  hasTrialActivated: true,
                  trialActivatedAt: new Date().toISOString(),
                  linkedUserId: userId,
        })

        // ── 6. Chamar generate-plans-on-demand ───────────────────────────────────────
        const appUrl =
                  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
          let plansGenerated = false
          let plansError = null

        if (appUrl) {
                  try {
                              const plansRes = await fetch(`${appUrl}/api/generate-plans-on-demand`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ userId }),
                              })
                              if (plansRes.ok) {
                                            plansGenerated = true
                              } else {
                                            const errText = await plansRes.text()
                                            plansError = errText
                              }
                  } catch (err: any) {
                              plansError = err?.message || "Erro ao gerar planos"
                  }
        }

        return NextResponse.json({
                  success: true,
                  userId,
                  email: cleanEmail,
                  isNewUser,
                  tempPassword: isNewUser ? tempPassword : null,
                  expirationDate: trialExpirationDate.toISOString(),
                  plansGenerated,
                  plansError,
        })
  } catch (error: any) {
          console.error("[admin] Error activating trial:", error)
          return NextResponse.json(
              { error: error?.message || "Erro interno ao ativar trial" },
              { status: 500 }
                  )
  }
}
