import { NextResponse } from "next/server"
import Stripe from "stripe"
import { adminDb, admin, auth } from "@/lib/firebaseAdmin"
import { Resend } from "resend"
import sgMail from "@sendgrid/mail"

// Configura a chave da API do Resend
const resendApiKey = process.env.RESEND_API_KEY
const resend = new Resend(resendApiKey)
console.log("[v0] RESEND_INIT - API Key present:", !!resendApiKey)
if (!resendApiKey) {
  console.error("[v0] RESEND_INIT - RESEND_API_KEY não está definida!")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
})

const sendgridApiKey = process.env.SENDGRID_API_KEY // Declare sendgridApiKey here
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey) // Set SendGrid API key only if it exists
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sessionId, subscription_id, customer_id, client_uid, payment_intent_id, plan_duration, price_id, userId, paymentId, billingType, customerName, customerEmail, customerPhone, customerCpf } = body

    console.log("[v0] HANDLE_POST_CHECKOUT_INIT - Recebido:", { sessionId, subscription_id, payment_intent_id, userId })

    if (!sessionId && !subscription_id && !payment_intent_id && !userId) {
      return NextResponse.json({ error: "sessionId, subscription_id, payment_intent_id ou userId ausente." }, { status: 400 })
    }

    let userEmail: string | null = null
    let userName: string | null = null
    let quizAnswersFromMetadata: any = {}
    let planType: string | null = price_id || null
    let stripeCustomerId: string | null = customer_id || null
    let subscriptionDuration: number = plan_duration || 30 // padrão 30 dias
    let clientUidFromSource: string | null = client_uid || null // Declare clientUidFromSource here

    // Se vem do webhook Asaas, usar os dados diretamente
    if (userId && customerEmail && customerEmail !== 'undefined') {
      userEmail = customerEmail
      userName = customerName || null
      clientUidFromSource = userId
      console.log("[v0] HANDLE_POST_CHECKOUT - Dados do Asaas webhook:", { userEmail, userName, clientUidFromSource })
    } else if (userId && !userEmail) {
      // Se não tem email do Asaas, buscar do Firebase usando o userId
      console.log("[v0] HANDLE_POST_CHECKOUT - Email não recebido do Asaas, buscando do Firebase:", userId)
      try {
        const userDocRef = adminDb.collection("users").doc(userId)
        const userDocSnap = await userDocRef.get()
        if (userDocSnap.exists) {
          const userData = userDocSnap.data()
          userEmail = userData?.email || null
          userName = userData?.name || customerName || null
          clientUidFromSource = userId
          console.log("[v0] HANDLE_POST_CHECKOUT - Dados recuperados do Firebase:", { userEmail, userName })
        }
      } catch (fbError) {
        console.error("[v0] HANDLE_POST_CHECKOUT - Erro ao buscar do Firebase:", fbError)
      }
    }

    if (payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id, {
        expand: ["customer"],
      })

      if (!paymentIntent) {
        return NextResponse.json({ error: "Payment Intent do Stripe não encontrado." }, { status: 404 })
      }

      const customer = paymentIntent.customer as Stripe.Customer
      userEmail = customer.email
      userName = customer.name
      planType = paymentIntent.metadata?.priceId || price_id
      clientUidFromSource = paymentIntent.metadata?.clientUid || clientUidFromSource
      stripeCustomerId = customer.id
      subscriptionDuration = Number.parseInt(paymentIntent.metadata?.planDuration || "30")

      // Buscar dados do quiz no Firestore
      if (clientUidFromSource) {
        try {
          const clientDocRef = adminDb.collection("users").doc(clientUidFromSource)
          const clientDocSnap = await clientDocRef.get()
          if (clientDocSnap.exists) {
            const clientData = clientDocSnap.data()
            quizAnswersFromMetadata = clientData?.quizData || clientData?.quizAnswers || {}
          }
        } catch (error) {
          console.warn("Não foi possível recuperar dados do quiz do Firestore:", error)
        }
      }
    } else if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["customer"],
      })

      if (!session) {
        return NextResponse.json({ error: "Sessão do Stripe não encontrada." }, { status: 404 })
      }

      userEmail = session.customer_details?.email || null
      userName = session.customer_details?.name || null
      quizAnswersFromMetadata = session.metadata?.quizAnswers ? JSON.parse(session.metadata.quizAnswers) : {}
      planType = session.metadata?.planType || null
      clientUidFromSource = session.metadata?.clientUid || clientUidFromSource
      stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id || null
    } else if (subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(subscription_id, {
        expand: ["customer"],
      })

      if (!subscription) {
        return NextResponse.json({ error: "Assinatura do Stripe não encontrada." }, { status: 404 })
      }

      const customer = subscription.customer as Stripe.Customer
      userEmail = customer.email
      userName = customer.name
      planType = subscription.items.data[0]?.price.id || null
      clientUidFromSource = subscription.metadata?.clientUid || clientUidFromSource
      stripeCustomerId = customer.id

      // For direct subscription, we need to get quiz data from Firestore using clientUid
      if (clientUidFromSource) {
        try {
          const clientDocRef = adminDb.collection("users").doc(clientUidFromSource)
          const clientDocSnap = await clientDocRef.get()
          if (clientDocSnap.exists) {
            const clientData = clientDocSnap.data()
            quizAnswersFromMetadata = clientData?.quizData || clientData?.quizAnswers || {}
          }
        } catch (error) {
          console.warn("Não foi possível recuperar dados do quiz do Firestore:", error)
        }
      }
    }

    const planNames: { [key: string]: string } = {
      price_1RajatPRgKqdJdqNnb9HQe17: "Plano Premium Mensal",
      price_1SPrzGPRgKqdJdqNNLfhAYNo: "Plano Semestral",
      price_1RajgKPRgKqdJdqNnhxim8dd: "Plano Premium Anual",
      price_1SPs2cPRgKqdJdqNbiXZYLhI: "Plano Trimestral",
      price_1RdpDTPRgKqdJdqNrvZccKxj: "Plano Anual Teste",
    }

    if (!userEmail) {
      console.error("ERRO: E-mail do cliente não encontrado.")
      return NextResponse.json({ error: "E-mail do cliente ausente." }, { status: 400 })
    }

    console.log("DEBUG: Iniciando processo de pós-checkout para:", { userEmail, clientUid: clientUidFromSource })

    let finalUserUid: string
    let isNewUser = false

    if (clientUidFromSource) {
      try {
        // Primeiro, tenta converter o usuário anônimo existente
        console.log(`DEBUG: Tentando converter usuário anônimo ${clientUidFromSource} para autenticado`)

        // Verifica se o usuário anônimo existe
        const anonymousUser = await auth.getUser(clientUidFromSource)

        if (anonymousUser && !anonymousUser.email) {
          // É um usuário anônimo, vamos convertê-lo
          console.log(`DEBUG: Convertendo usuário anônimo ${clientUidFromSource} para ${userEmail}`)

          await auth.updateUser(clientUidFromSource, {
            email: userEmail,
            displayName: userName,
            emailVerified: false,
          })

          finalUserUid = clientUidFromSource
          isNewUser = true // Tratamos como novo usuário para envio de email
          console.log(`DEBUG: Usuário anônimo convertido com sucesso: ${finalUserUid}`)
        } else {
          // Não é anônimo ou não existe, criar novo usuário
          throw new Error("Usuário não é anônimo ou não existe")
        }
      } catch (conversionError: any) {
        console.log(`DEBUG: Conversão falhou, criando novo usuário. Erro: ${conversionError.message}`)

        // Se a conversão falhar, criar novo usuário
        try {
          const existingUser = await auth.getUserByEmail(userEmail)
          finalUserUid = existingUser.uid
          console.log(`DEBUG: Usuário existente encontrado: ${finalUserUid}`)
        } catch (notFoundError: any) {
          if (notFoundError.code === "auth/user-not-found") {
            const temporaryPassword = Math.random().toString(36).slice(-12) + "A1!"
            const newUser = await auth.createUser({
              email: userEmail,
              password: temporaryPassword,
              displayName: userName,
              emailVerified: false,
            })
            finalUserUid = newUser.uid
            isNewUser = true
            console.log(`DEBUG: Novo usuário criado: ${finalUserUid}`)

            // Limpar usuário anônimo se existir
            if (clientUidFromSource && clientUidFromSource !== finalUserUid) {
              try {
                await auth.deleteUser(clientUidFromSource)
                console.log(`DEBUG: Usuário anônimo ${clientUidFromSource} deletado`)
              } catch (deleteError) {
                console.warn(`Falha ao deletar usuário anônimo: ${deleteError}`)
              }
            }
          } else {
            throw notFoundError
          }
        }
      }
    } else {
      // Sem clientUid, criar novo usuário normalmente
      try {
        const existingUser = await auth.getUserByEmail(userEmail)
        finalUserUid = existingUser.uid
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          const temporaryPassword = Math.random().toString(36).slice(-12) + "A1!"
          const newUser = await auth.createUser({
            email: userEmail,
            password: temporaryPassword,
            displayName: userName,
            emailVerified: false,
          })
          finalUserUid = newUser.uid
          isNewUser = true
        } else {
          throw error
        }
      }
    }

    let existingUserData: admin.firestore.DocumentData = {}
    if (clientUidFromSource) {
      try {
        const clientDocRef = adminDb.collection("users").doc(clientUidFromSource)
        const clientDocSnap = await clientDocRef.get()

        if (clientDocSnap && clientDocSnap.exists && clientDocSnap.data()) {
          existingUserData = clientDocSnap.data() || {}
          console.log(`Dados existentes do UID do cliente (${clientUidFromSource}) recuperados.`)
        } else {
          console.warn(`Nenhum documento encontrado para o clientUid: ${clientUidFromSource}.`)
        }
      } catch (firestoreError: any) {
        console.error(`Erro ao buscar documento do clientUid ${clientUidFromSource}:`, firestoreError.message)
      }
    }

    let dietPlan = existingUserData.dietPlan
    let workoutPlan = existingUserData.workoutPlan

    let plansAlreadyGenerated = false
    if (clientUidFromSource) {
      try {
        const userDocRef = adminDb.collection("users").doc(clientUidFromSource)
        const userDoc = await userDocRef.get()
        if (userDoc.exists) {
          const userData = userDoc.data()
          // Verificar se os planos existem e foram gerados recentemente (últimos 10 minutos)
          if (userData?.dietPlan && userData?.workoutPlan) {
            const dietTimestamp = userData.dietPlan.createdAt
            const now = Date.now()
            const tenMinutesAgo = now - 10 * 60 * 1000

            if (dietTimestamp && new Date(dietTimestamp).getTime() > tenMinutesAgo) {
              plansAlreadyGenerated = true
              console.log("[v0] Planos já foram gerados durante o checkout, pulando geração")
            }
          }
        }
      } catch (error) {
        console.error("[v0] Erro ao verificar planos existentes:", error)
      }
    }

    if (!plansAlreadyGenerated && clientUidFromSource) {
      console.log("[v0] Gerando planos pois não foram encontrados planos recentes...")
      
      // NÃO ESPERAR pela geração de planos - fazer em background
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/generate-plans-on-demand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientUidFromSource }),
      })
        .then((response) => {
          if (response.ok) {
            console.log("[v0] Planos gerados com sucesso em background")
          } else {
            console.error("[v0] Erro ao gerar planos em background")
          }
        })
        .catch((error) => {
          console.error("[v0] Erro na chamada de geração de planos em background:", error)
        })
      
      console.log("[v0] Continuando checkout sem esperar geração de planos...")
    }

    // A geração de planos é feita pelo generate-plans-on-demand que já foi chamado acima
    // Aqui apenas verificamos se os planos existem para logging
    if (!dietPlan || !workoutPlan) {
      console.log("DEBUG: Planos não encontrados ainda - serão gerados pelo generate-plans-on-demand em background para:", finalUserUid)
    }

    console.log("DEBUG: Consolidando e salvando dados completos no Firestore para o usuário:", finalUserUid)
    console.log("DEBUG: Dados que serão salvos:", {
      name: userName,
      email: userEmail,
      hasQuizData: !!quizAnswersFromMetadata && Object.keys(quizAnswersFromMetadata).length > 0,
      planType: planType,
      stripeCustomerId: stripeCustomerId,
      isNewUser: isNewUser,
    })

    const userDocRef = adminDb.collection("users").doc(finalUserUid)
    // Se é novo usuário, seta initialWeight (peso inicial fixo)
    const initialQuizData = isNewUser 
      ? { ...quizAnswersFromMetadata, initialWeight: quizAnswersFromMetadata.currentWeight }
      : existingUserData.quizData
    
    const userData = {
      ...existingUserData,
      name: userName,
      email: userEmail,
      quizAnswers: { ...existingUserData.quizAnswers, ...quizAnswersFromMetadata },
      quizData: {
        ...initialQuizData,
        ...quizAnswersFromMetadata,
        // Garantir que initialWeight sempre tem um valor válido
        initialWeight: initialQuizData.initialWeight || quizAnswersFromMetadata.weight || quizAnswersFromMetadata.currentWeight || "0",
        currentWeight: quizAnswersFromMetadata.currentWeight || quizAnswersFromMetadata.weight || "0",
      },
      personalData: existingUserData.personalData || {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: existingUserData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      isSetupComplete: true,
      hasGeneratedPlans: !!(dietPlan && workoutPlan),
      subscriptionStatus: "active",
      // Calculando data de expiração baseada na duração do plano
      subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + subscriptionDuration * 24 * 60 * 60 * 1000),
      ),
      planName: planNames[planType] || "Plano Premium",
      stripeCustomerId: stripeCustomerId,
      planType: planType,
      isPremium: true,
      role: "client",
    }

    try {
      await userDocRef.set(userData, { merge: true })
      console.log(`DEBUG: Dados salvos com sucesso no Firestore para usuário: ${finalUserUid}`)

      const verificationDoc = await userDocRef.get()
      if (!verificationDoc.exists) {
        throw new Error("Documento do usuário não foi criado corretamente no Firestore")
      }
      console.log(`DEBUG: Verificação confirmada - documento existe no Firestore para: ${finalUserUid}`)
    } catch (firestoreError: any) {
      console.error("ERRO FATAL: Falha ao salvar dados no Firestore:", {
        error: firestoreError.message,
        uid: finalUserUid,
        userData: userData,
      })
      return NextResponse.json(
        {
          error: "Falha ao salvar dados do usuário.",
          details: firestoreError.message,
        },
        { status: 500 },
      )
    }

    let passwordResetLink = ""
    if (isNewUser) {
      try {
        passwordResetLink = await auth.generatePasswordResetLink(userEmail, {
          url: `${process.env.NEXT_PUBLIC_URL}/auth`,
          handleCodeInApp: false,
        })
        console.log("DEBUG: Link de redefinição de senha gerado com sucesso")
      } catch (linkError: any) {
        console.error("ERRO: Falha ao gerar link de redefinição de senha:", linkError.message)
        // Continue without the link - user can still use forgot password on login page
      }
    }

    // ==================== EMAIL COM RESEND ====================
    // Resend funciona independentemente de SendGrid
    console.log("[v0] EMAIL_BLOCK_START - Iniciando bloco de email")
    const emailSubject = isNewUser
      ? "Bem-vindo(a) ao FitGoal! Crie sua senha."
      : "Sua Assinatura FitGoal foi Confirmada!"
    const displayPlanName = planNames[planType!] || planType

    let emailHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #84cc16;">Olá, ${userName || "campeão(ã)"}!</h1>
        <p>Sua assinatura do plano <strong>${displayPlanName}</strong> foi confirmada!</p>
    `

    if (isNewUser) {
      emailHtmlContent += `
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Dados de acesso:</strong></p>
          <p>Email: <code style="background-color: white; padding: 5px 10px; border-radius: 3px;">${userEmail}</code></p>
        </div>
      `
      if (passwordResetLink) {
        emailHtmlContent += `
          <p>Para começar, crie sua senha clicando no botão abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${passwordResetLink}" style="background-color: #84cc16; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Criar Minha Senha</a>
          </div>
          <p><small>Se o botão não funcionar, copie e cole este link no seu navegador:<br>${passwordResetLink}</small></p>
        `
      } else {
        emailHtmlContent += `
          <p>Para acessar sua conta, vá para a página de login e use a opção "Esqueceu a senha?" com seu e-mail:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_URL}/auth" style="background-color: #84cc16; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Fazer Login</a>
          </div>
        `
      }
    } else {
      emailHtmlContent += `
        <p>Acesse seu dashboard aqui:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" style="background-color: #84cc16; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Acessar Dashboard</a>
        </div>
      `
    }

    emailHtmlContent += `
        <p>Se você tiver alguma dúvida, entre em contato conosco.</p>
        <p>Equipe FitGoal</p>
      </div>
    `

    try {
      if (!userEmail) {
        console.warn("[v0] RESEND_WARNING - Email não disponível, não é possível enviar")
        throw new Error("Email não disponível para envio")
      }

      console.log("[v0] RESEND_SENDING - Iniciando envio de email")
      console.log("[v0] RESEND_EMAIL - Para:", userEmail)
      console.log("[v0] RESEND_SUBJECT - Assunto:", emailSubject)
      console.log("[v0] RESEND_KEY_EXISTS - API Key configurada:", !!resendApiKey)
      
      if (resendApiKey) {
        console.log("[v0] RESEND_CALLING - Chamando resend.emails.send()")
        const response = await resend.emails.send({
          from: "FitGoal <noreply@fitgoal.com.br>",
          replyTo: "suporte@fitgoal.com.br",
          to: userEmail,
          subject: emailSubject,
          html: emailHtmlContent,
        })
        
        console.log(`[v0] RESEND_SUCCESS - E-mail enviado com sucesso para ${userEmail}:`, response)
      } else {
        console.warn("[v0] RESEND_KEY_MISSING - RESEND_API_KEY não configurada, pulando envio")
      }
    } catch (emailError: any) {
      console.error("[v0] RESEND_ERROR - Falha ao enviar e-mail:", {
        error: emailError?.message,
        errorFull: emailError,
        email: userEmail,
        subject: emailSubject,
        stack: emailError?.stack,
      })
      // Don't fail the entire process if email fails
    }

    console.log(`DEBUG: Processo de pós-checkout concluído com sucesso para usuário: ${finalUserUid}`)
    return NextResponse.json({
      received: true,
      message: "Pós-checkout processado com sucesso.",
      userUid: finalUserUid,
      isNewUser: isNewUser,
    })
  } catch (error) {
    console.error("ERRO FATAL em handle-post-checkout:", {
      message: error.message,
      stack: error.stack,
    })
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
  }
}
