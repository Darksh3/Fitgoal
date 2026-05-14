import { NextRequest, NextResponse } from "next/server"
import { adminDb, auth, admin } from "@/lib/firebaseAdmin"
import { Resend } from "resend"

const TRIAL_DAYS = 7
const DEFAULT_PASSWORD = "Fitgo4l"
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, uid } = body

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const displayName = name || cleanEmail.split("@")[0]

    // Verificar se já tem trial ativo
    const leadsSnap = await adminDb
      .collection("leads")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get()

    const leadDoc = leadsSnap.empty ? null : leadsSnap.docs[0]
    const leadData = leadDoc?.data() || {}
    const leadId = leadDoc?.id || uid || null

    if (leadData.hasTrialActivated) {
      return NextResponse.json(
        { error: "Você já utilizou seu trial gratuito." },
        { status: 409 }
      )
    }

    // Verificar se já existe usuário no Auth
    let firebaseUser: any = null
    try {
      firebaseUser = await auth.getUserByEmail(cleanEmail)
    } catch {
      firebaseUser = null
    }

    const trialExpiresAt = new Date()
    trialExpiresAt.setDate(trialExpiresAt.getDate() + TRIAL_DAYS)

    let userId: string
    let isNewUser = false

    if (firebaseUser) {
      userId = firebaseUser.uid
      await auth.updateUser(userId, { password: DEFAULT_PASSWORD })
    } else {
      const createParams: any = {
        email: cleanEmail,
        password: DEFAULT_PASSWORD,
        displayName,
        emailVerified: false,
      }
      if (leadId) createParams.uid = leadId
      const newUser = await auth.createUser(createParams)
      userId = newUser.uid
      isNewUser = true
    }

    // Verificar se já existe doc no Firestore users
    const usersSnap = await adminDb
      .collection("users")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get()

    const firestoreDocId = usersSnap.empty ? userId : usersSnap.docs[0].id

    // Salvar usuário no Firestore
    await adminDb.collection("users").doc(firestoreDocId).set(
      {
        uid: userId,
        email: cleanEmail,
        name: displayName,
        subscriptionStatus: "active",
        plan: "trial",
        expirationDate: trialExpiresAt.toISOString(),
        subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(trialExpiresAt),
        hasPaid: false,
        trialActivatedBy: "self",
        trialActivatedAt: new Date().toISOString(),
        leadId: leadId,
      },
      { merge: true }
    )

    // Marcar lead como trial ativado
    if (leadId) {
      await adminDb.collection("leads").doc(leadId).set(
        {
          hasTrialActivated: true,
          trialActivatedAt: new Date().toISOString(),
          linkedUserId: firestoreDocId,
        },
        { merge: true }
      )
    }

    // Gerar planos automaticamente
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
    if (appUrl) {
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 12000)
        await fetch(`${appUrl}/api/generate-plans-on-demand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: firestoreDocId }),
          signal: controller.signal,
        })
      } catch (err) {
        console.error("[start-trial] Erro ao gerar planos:", err)
      }
    }

    // Enviar email de boas-vindas
    const loginUrl = `${appUrl}/auth`
    const expirationFormatted = trialExpiresAt.toLocaleDateString("pt-BR")

    await resend.emails.send({
      from: "FitGoal <noreply@fitgoal.com.br>",
      replyTo: "suporte@fitgoal.com.br",
      to: cleanEmail,
      subject: "Seu trial gratuito de 7 dias está pronto! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #ffffff; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #84cc16; font-size: 28px; margin: 0;">FitGoal</h1>
            <p style="color: #94a3b8; margin: 8px 0 0;">Plano de Dieta e Treino 100% Personalizado</p>
          </div>
          <h2 style="color: #ffffff; font-size: 22px;">Olá, ${displayName}! 👋</h2>
          <p style="color: #cbd5e1; line-height: 1.6;">
            Seu <strong style="color: #84cc16;">trial gratuito de 7 dias</strong> foi ativado com sucesso!
            Você tem acesso completo ao plano até <strong style="color: #84cc16;">${expirationFormatted}</strong>.
          </p>
          <div style="background-color: #1e293b; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #94a3b8; margin: 0 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Seus dados de acesso</p>
            <p style="margin: 4px 0; color: #cbd5e1;"><strong>Email:</strong> ${cleanEmail}</p>
            <p style="margin: 4px 0; color: #cbd5e1;"><strong>Senha temporária:</strong> <code style="background-color: #0f172a; padding: 2px 8px; border-radius: 4px; color: #84cc16;">${DEFAULT_PASSWORD}</code></p>
          </div>
          <p style="color: #94a3b8; font-size: 14px;">Recomendamos que você altere sua senha após o primeiro acesso.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="background-color: #84cc16; color: #000000; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Acessar Minha Conta Agora
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #1e293b; margin: 32px 0;" />
          <p style="color: #64748b; font-size: 13px; text-align: center;">
            Equipe FitGoal · <a href="mailto:suporte@fitgoal.com.br" style="color: #84cc16;">suporte@fitgoal.com.br</a>
          </p>
        </div>
      `,
    }).catch((err) => {
      console.error("[start-trial] Erro ao enviar email:", err)
    })

    return NextResponse.json({
      success: true,
      userId: firestoreDocId,
      isNewUser,
      expirationDate: trialExpiresAt.toISOString(),
      tempPassword: DEFAULT_PASSWORD,
    })
  } catch (error: any) {
    console.error("[start-trial] Erro:", error)
    return NextResponse.json(
      { error: error?.message || "Erro interno ao ativar trial" },
      { status: 500 }
    )
  }
}
