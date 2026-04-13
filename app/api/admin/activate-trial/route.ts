import { NextResponse } from "next/server"
import { adminDb, auth, admin } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"
import { Resend } from "resend"

const ADMIN_DEFAULT_PASSWORD = "Fitgo4l"

const resend = new Resend(process.env.RESEND_API_KEY)

async function getUserByEmailSafe(email: string) {
      try {
              return await auth.getUserByEmail(email)
      } catch {
              return null
      }
}

async function getUserByUidSafe(uid: string) {
      try {
              return await auth.getUser(uid)
      } catch {
              return null
      }
}

async function getFirestoreUserByEmail(email: string) {
      const usersSnap = await adminDb.collection("users").where("email", "==", email).limit(1).get()
      if (usersSnap.empty) {
              return null
      }
      const doc = usersSnap.docs[0]
      return { id: doc.id, data: doc.data() }
}

export async function POST(request: Request) {
      const isAdmin = await isAdminRequest()
      if (!isAdmin) {
              return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
      }

  try {
          const { email, action, userId: userIdParam, userName: userNameParam, days } = await request.json()

        if (!email) {
                  return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
        }

        const trialDays = Number.isInteger(Number(days)) && Number(days) > 0 ? Number(days) : 15

        const cleanEmail = email.toLowerCase().trim()

        // ── Envio de email de acesso (ação separada) ──────────────────────────────
        if (action === "send-email") {
                  if (!userIdParam) {
                              return NextResponse.json({ error: "userId é obrigatório para envio de email" }, { status: 400 })
                  }

            const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
                  const loginUrl = `${appUrl}/auth`

            const userDoc = await adminDb.collection("users").doc(userIdParam).get()
                  const userData = userDoc.data()
                  const expirationDate = userData?.expirationDate
                    ? new Date(userData.expirationDate).toLocaleDateString("pt-BR")
                              : null
                  const displayName = userNameParam || userData?.name || null

            const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #ffffff; padding: 40px; border-radius: 12px;">
                              <div style="text-align: center; margin-bottom: 32px;">
                                          <h1 style="color: #84cc16; font-size: 28px; margin: 0;">FitGoal</h1>
                                                      <p style="color: #94a3b8; margin: 8px 0 0;">Plano de Dieta e Treino 100% Personalizado</p>
                                                                </div>
                                                                          <h2 style="color: #ffffff; font-size: 22px;">Olá${displayName ? ", " + displayName : ""}! 👋</h2>
                                                                                    <p style="color: #cbd5e1; line-height: 1.6;">
                                                                                                Seu acesso de <strong style="color: #84cc16;">trial de 15 dias</strong> ao FitGoal foi ativado com sucesso!
                                                                                                            ${expirationDate ? `Você tem acesso completo ao plano até <strong style="color: #84cc16;">${expirationDate}</strong>.` : ""}
                                                                                                                      </p>
                                                                                                                                <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin: 24px 0;">
                                                                                                                                            <p style="color: #94a3b8; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Seus dados de acesso</p>
                                                                                                                                                        <p style="margin: 4px 0; color: #cbd5e1;"><strong>Email:</strong> ${cleanEmail}</p>
                                                                                                                                                                    <p style="margin: 4px 0; color: #cbd5e1;"><strong>Senha:</strong> <code style="background-color: #0f172a; padding: 2px 8px; border-radius: 4px; color: #84cc16;">${ADMIN_DEFAULT_PASSWORD}</code></p>
                                                                                                                                                                              </div>
                                                                                                                                                                                        <p style="color: #94a3b8; font-size: 14px;">Recomendamos que você altere sua senha após o primeiro acesso.</p>
                                                                                                                                                                                                  <div style="text-align: center; margin: 32px 0;">
                                                                                                                                                                                                              <a href="${loginUrl}" style="background-color: #84cc16; color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                                                                                                                                                                                                                            Acessar Minha Conta
                                                                                                                                                                                                                                        </a>
                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                            <hr style="border: none; border-top: 1px solid #1e293b; margin: 32px 0;" />
                                                                                                                                                                                                                                                                      <p style="color: #64748b; font-size: 13px; text-align: center;">
                                                                                                                                                                                                                                                                                  Equipe FitGoal · <a href="mailto:suporte@fitgoal.com.br" style="color: #84cc16;">suporte@fitgoal.com.br</a>
                                                                                                                                                                                                                                                                                            </p>
                                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                                          `

            const emailRes = await resend.emails.send({
                        from: "FitGoal <noreply@fitgoal.com.br>",
                        replyTo: "suporte@fitgoal.com.br",
                        to: cleanEmail,
                        subject: "Seu acesso trial ao FitGoal está pronto! 🎉",
                        html: emailHtml,
            })

            if (emailRes.error) {
                        return NextResponse.json({ error: emailRes.error.message || "Erro ao enviar email" }, { status: 500 })
            }

            return NextResponse.json({ success: true, emailId: emailRes.data?.id })
        }

        // ── Buscar lead pelo email ─────────────────────────────────────────────────
        const leadsSnap = await adminDb
            .collection("leads")
            .where("email", "==", cleanEmail)
            .limit(1)
            .get()

        const leadDoc = leadsSnap.empty ? null : leadsSnap.docs[0]
          const leadId = leadDoc?.id || null
          const leadData = leadDoc?.data() || {}
          const existingUser = await getFirestoreUserByEmail(cleanEmail)
          const existingUserId = existingUser?.id || null
          const subscriptionExpiresAt = existingUser?.data?.subscriptionExpiresAt
          const existingUserExpirationDate = subscriptionExpiresAt?.toDate
            ? subscriptionExpiresAt.toDate().toISOString()
            : subscriptionExpiresAt || existingUser?.data?.expirationDate || null

                  if (action === "lookup") {
                            if (leadDoc) {
                                        return NextResponse.json({
                                                      found: true,
                                                      leadId,
                                                      userId: existingUserId,
                                                      email: leadData.email || cleanEmail,
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
                                                      expirationDate: existingUserExpirationDate,
                                        })
                            } else {
                                        return NextResponse.json({
                                                      found: false,
                                                      leadId: null,
                                                      userId: existingUserId,
                                                      email: cleanEmail,
                                                      name: null,
                                                      quizData: {},
                                                      hasPaid: false,
                                                      hasTrialActivated: false,
                                                      expirationDate: existingUserExpirationDate,
                                        })
                            }
                  }

        if (action !== "activate" && action !== "extend") {
                  return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
        }

        const trialExpirationDate = new Date()
          trialExpirationDate.setDate(trialExpirationDate.getDate() + trialDays)

        const tempPassword = ADMIN_DEFAULT_PASSWORD

        // Buscar usuário no Firebase Auth pelo email
        let firebaseUser = await getUserByEmailSafe(cleanEmail)

        // Se não encontrou no Auth, tentar pelo UID do lead
        if (!firebaseUser && leadId) {
                  firebaseUser = await getUserByUidSafe(leadId)
        }

        // Se ainda não encontrou, buscar no Firestore users pelo email para pegar o UID
        if (!firebaseUser) {
                  const usersSnap = await adminDb
                    .collection("users")
                    .where("email", "==", cleanEmail)
                    .limit(1)
                    .get()

            if (!usersSnap.empty) {
                        const existingUid = usersSnap.docs[0].id
                        firebaseUser = await getUserByUidSafe(existingUid)

                    // Se o documento existe no Firestore mas não no Auth, criar no Auth com esse UID
                    if (!firebaseUser) {
                                  const existingData = usersSnap.docs[0].data()
                                  const createParams: any = {
                                                  uid: existingUid,
                                                  email: cleanEmail,
                                                  password: tempPassword,
                                                  displayName: existingData.name || leadData.name || cleanEmail.split("@")[0],
                                                  emailVerified: false,
                                  }
                                  const newUser = await auth.createUser(createParams)
                                  firebaseUser = newUser
                    }
            }
        }

        let userId: string
          let isNewUser = false

        if (firebaseUser) {
                  userId = firebaseUser.uid
                  isNewUser = false
                  await auth.updateUser(userId, { password: tempPassword })
        } else {
                  // Criar usuário novo do zero
            const createParams: any = {
                        email: cleanEmail,
                        password: tempPassword,
                        displayName: leadData.name || leadData.firstName || cleanEmail.split("@")[0],
                        emailVerified: false,
            }
                  if (leadId) {
                              createParams.uid = leadId
                  }
                  const newUser = await auth.createUser(createParams)
                  userId = newUser.uid
                  isNewUser = true
        }

        const userName = leadData.name || leadData.firstName || null

        // Se for apenas extensão de dias e o usuário já existe no Firestore, manter o plano atual em vez de forçar trial.
        if (action === "extend" && existingUserId) {
                  const existingUserDoc = await adminDb.collection("users").doc(existingUserId).get()
                  const currentExpiration = existingUserDoc.data()?.expirationDate
                  const baseExpiration = currentExpiration ? new Date(currentExpiration) : new Date()
                  const extendedDate = new Date(baseExpiration)
                  extendedDate.setDate(extendedDate.getDate() + trialDays)

                  await adminDb.collection("users").doc(existingUserId).update({
                              expirationDate: extendedDate.toISOString(),
                              subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(extendedDate),
                              subscriptionStatus: "active",
                  })

                  if (leadId && !leadData.hasPaid) {
                            await adminDb.collection("leads").doc(leadId).update({
                                          hasTrialActivated: true,
                                          trialActivatedAt: new Date().toISOString(),
                                          linkedUserId: existingUserId,
                            })
                  }

                  return NextResponse.json({
                              success: true,
                              userId: existingUserId,
                              email: cleanEmail,
                              name: userName,
                              isNewUser: false,
                              tempPassword,
                              expirationDate: extendedDate.toISOString(),
                              plansGenerated: true,
                              plansError: null,
                  })
        }

        await adminDb.collection("users").doc(userId).set(
            {
                        uid: userId,
                        email: cleanEmail,
                        name: userName,
                        subscriptionStatus: "active",
                        plan: "trial",
                        expirationDate: trialExpirationDate.toISOString(),
                        subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(trialExpirationDate),
                        hasPaid: false,
                        trialActivatedBy: "admin",
                        trialActivatedAt: new Date().toISOString(),
                        leadId: leadId,
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

        if (leadId) {
                  await adminDb.collection("leads").doc(leadId).update({
                              hasTrialActivated: true,
                              trialActivatedAt: new Date().toISOString(),
                              linkedUserId: userId,
                  })
        }

        const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
          let plansGenerated = false
          let plansError = null

        if (appUrl) {
                  try {
                              const controller = new AbortController()
                              const timeoutId = setTimeout(() => controller.abort(), 10000)

                    const plansRes = await fetch(`${appUrl}/api/generate-plans-on-demand`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId }),
                                  signal: controller.signal,
                    })

                    clearTimeout(timeoutId)

                    if (plansRes.ok) {
                                  plansGenerated = true
                    } else {
                                  plansError = await plansRes.text()
                    }
                  } catch (err: any) {
                              plansError = err?.name === "AbortError" ? "Timeout ao gerar planos" : (err?.message || "Erro ao gerar planos")
                  }
        }

        return NextResponse.json({
                  success: true,
                  userId,
                  email: cleanEmail,
                  name: userName,
                  isNewUser,
                  tempPassword,
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
