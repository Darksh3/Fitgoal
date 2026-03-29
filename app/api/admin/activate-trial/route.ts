import { NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

// Senha padrão definida pelo admin para acessar a conta antes de enviar o e-mail ao usuário
const ADMIN_DEFAULT_PASSWORD = "Fitgo4l"

// Helper: busca usuário pelo email sem lançar exceção
async function getUserByEmailSafe(email: string) {
  try {
    return await auth.getUserByEmail(email)
  } catch {
    return null
  }
}

// Helper: busca usuário pelo uid sem lançar exceção
async function getUserByUidSafe(uid: string) {
  try {
    return await auth.getUser(uid)
  } catch {
    return null
  }
}

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

    const cleanEmail = email.toLowerCase().trim()

    // ── 1. Buscar lead pelo email (opcional) ───────────────────────────────────
    const leadsSnap = await adminDb
      .collection("leads")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get()

    const leadDoc = leadsSnap.empty ? null : leadsSnap.docs[0]
    const leadId = leadDoc?.id || null
    const leadData = leadDoc?.data() || {}

    // Se for apenas busca de dados do lead, retorna aqui
    if (action === "lookup") {
      if (leadDoc) {
        return NextResponse.json({
          found: true,
          leadId,
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
        })
      } else {
        // Sem lead: retorna dados mínimos para permitir ativação
        return NextResponse.json({
          found: false,
          leadId: null,
          email: cleanEmail,
          name: null,
          quizData: {},
          hasPaid: false,
          hasTrialActivated: false,
        })
      }
    }

    // ── 2. Ativar trial ────────────────────────────────────────────────────────
    if (action !== "activate") {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
    }

    const trialExpirationDate = new Date()
    trialExpirationDate.setDate(trialExpirationDate.getDate() + 15)

    const tempPassword = ADMIN_DEFAULT_PASSWORD

    // ── 3. Resolver usuário Firebase Auth de forma segura ──────────────────────
    let firebaseUser = await getUserByEmailSafe(cleanEmail)

    if (!firebaseUser && leadId) {
      firebaseUser = await getUserByUidSafe(leadId)
    }

    let userId: string
    let isNewUser = false

    if (firebaseUser) {
      userId = firebaseUser.uid
      isNewUser = false
      await auth.updateUser(userId, { password: tempPassword })
    } else {
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

    // ── 4. Atualizar documento na coleção users ────────────────────────────────
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

    // ── 5. Atualizar o lead marcando o trial (somente se existir lead) ──────────
    if (leadId) {
      await adminDb.collection("leads").doc(leadId).update({
        hasTrialActivated: true,
        trialActivatedAt: new Date().toISOString(),
        linkedUserId: userId,
      })
    }

    // ── 6. Chamar generate-plans-on-demand ─────────────────────────────────────
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
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
