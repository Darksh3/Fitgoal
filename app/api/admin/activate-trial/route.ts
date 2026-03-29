import { NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"
import { Resend } from "resend"

// Senha padrão definida pelo admin para acessar a conta antes de enviar o e-mail ao usuário
const ADMIN_DEFAULT_PASSWORD = "Fitgo4l"

const resend = new Resend(process.env.RESEND_API_KEY)

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
    const userName = leadData.name || leadData.firstName || null

    await adminDb
      .collection("users")
      .doc(userId)
      .set(
        {
          uid: userId,
          email: cleanEmail,
          name: userName,
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

    // ── 7. Enviar email de acesso via Resend ───────────────────────────────────
    const loginUrl = `${appUrl}/auth`
    const expirationFormatted = trialExpirationDate.toLocaleDateString("pt-BR")

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #84cc16; font-size: 28px; margin: 0;">FitGoal</h1>
          <p style="color: #94a3b8; margin: 8px 0 0;">Plano de Dieta e Treino 100% Personalizado</p>
        </div>

        <h2 style="color: #ffffff; font-size: 22px;">Olá${userName ? ", " + userName : ""}! 👋</h2>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Seu acesso de <strong style="color: #84cc16;">trial de 15 dias</strong> ao FitGoal foi ativado com sucesso!
          Você tem acesso completo ao plano até <strong style="color: #84cc16;">${expirationFormatted}</strong>.
        </p>

        <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="color: #94a3b8; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Seus dados de acesso</p>
          <p style="margin: 4px 0; color: #cbd5e1;"><strong>Email:</strong> ${cleanEmail}</p>
          <p style="margin: 4px 0; color: #cbd5e1;"><strong>Senha:</strong> <code style="background-color: #0f172a; padding: 2px 8px; border-radius: 4px; color: #84cc16;">${tempPassword}</code></p>
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

    let emailSent = false
    let emailError = null

    try {
      const emailRes = await resend.emails.send({
        from: "FitGoal <noreply@fitgoal.com.br>",
        replyTo: "suporte@fitgoal.com.br",
        to: cleanEmail,
        subject: "Seu acesso trial ao FitGoal está pronto! 🎉",
        html: emailHtml,
      })

      if (emailRes.error) {
        emailError = emailRes.error.message || "Erro ao enviar email"
      } else {
        emailSent = true
      }
    } catch (err: any) {
      emailError = err?.message || "Erro ao enviar email"
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
      emailSent,
      emailError,
    })
  } catch (error: any) {
    console.error("[admin] Error activating trial:", error)
    return NextResponse.json(
      { error: error?.message || "Erro interno ao ativar trial" },
      { status: 500 }
    )
  }
}
