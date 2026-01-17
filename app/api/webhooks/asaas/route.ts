import { NextResponse } from "next/server"
import { db } from "@/lib/firebaseAdmin"

const ASAAS_API_KEY = process.env.ASAAS_API_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const event = body.event

    console.log("[v0] Webhook Asaas recebido:", event, "ID:", body.payment?.id || body.subscription?.id)

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        const payment = body.payment
        const anonUserId = payment.externalReference // This is the anonymous user ID from quiz

        console.log("[v0] Pagamento confirmado:", {
          anonUserId,
          paymentId: payment.id,
          value: payment.value,
          billingType: payment.billingType,
        })

        if (anonUserId) {
          try {
            const pendingPaymentsRef = db.collection("pending_payments")
            const snapshot = await pendingPaymentsRef.where("externalReference", "==", anonUserId).get()

            if (!snapshot.empty) {
              const pendingPayment = snapshot.docs[0].data()

              const newPassword = Math.random().toString(36).slice(-12)

              let leadData: any = {}
              try {
                const leadDocRef = db.collection("leads").doc(anonUserId)
                const leadDocSnap = await leadDocRef.get()
                if (leadDocSnap.exists()) {
                  leadData = leadDocSnap.data() || {}
                  console.log("[v0] Lead data found:", leadData)
                }
              } catch (leadError) {
                console.warn("[v0] Erro ao buscar lead data:", leadError)
              }

              try {
                const userRecord = await require("firebase-admin").auth().createUser({
                  email: pendingPayment.email,
                  password: newPassword,
                  displayName: pendingPayment.name,
                })

                console.log("[v0] Usuário criado no Firebase Auth:", userRecord.uid)

                const userRef = db.collection("users").doc(userRecord.uid)
                const planDays = { mensal: 30, trimestral: 90, semestral: 180 }
                const days = planDays[pendingPayment.planType] || 30
                const endDate = new Date()
                endDate.setDate(endDate.getDate() + days)

                await userRef.set(
                  {
                    email: pendingPayment.email,
                    name: pendingPayment.name,
                    planType: pendingPayment.planType,
                    subscriptionActive: true,
                    subscriptionStartDate: new Date(),
                    subscriptionEndDate: endDate,
                    paymentId: payment.id,
                    paymentStatus: "confirmed",
                    quizData: leadData.quizData || pendingPayment.quizData || {},
                    age: leadData.quizData?.age || pendingPayment.quizData?.age,
                    gender: leadData.quizData?.gender || pendingPayment.quizData?.gender,
                    height: leadData.quizData?.height || pendingPayment.quizData?.height,
                    weight: leadData.quizData?.weight || pendingPayment.quizData?.weight,
                    targetWeight: leadData.quizData?.targetWeight || pendingPayment.quizData?.targetWeight,
                    bodyFat: leadData.quizData?.bodyFat || pendingPayment.quizData?.bodyFat,
                    experience: leadData.quizData?.experience || pendingPayment.quizData?.experience,
                    imc: leadData.quizData?.imc || pendingPayment.quizData?.imc,
                    imcClassification:
                      leadData.quizData?.imcClassification || pendingPayment.quizData?.imcClassification,
                    convertedAt: new Date(),
                  },
                  { merge: true },
                )

                console.log("[v0] Assinatura ativada para:", userRecord.uid)

                try {
                  await db.collection("leads").doc(anonUserId).delete()
                  console.log("[v0] Lead document deleted after user creation:", anonUserId)
                } catch (deleteError) {
                  console.warn("[v0] Erro ao deletar lead document:", deleteError)
                }
              } catch (authError: any) {
                if (authError.code === "auth/email-already-exists") {
                  console.log("[v0] Usuário já existe, atualizando plano...")

                  const usersRef = db.collection("users")
                  const userQuery = await usersRef.where("email", "==", pendingPayment.email).limit(1).get()

                  if (!userQuery.empty) {
                    const existingUserId = userQuery.docs[0].id
                    const planDays = { mensal: 30, trimestral: 90, semestral: 180 }
                    const days = planDays[pendingPayment.planType] || 30
                    const endDate = new Date()
                    endDate.setDate(endDate.getDate() + days)

                    await userQuery.docs[0].ref.update({
                      planType: pendingPayment.planType,
                      subscriptionActive: true,
                      subscriptionStartDate: new Date(),
                      subscriptionEndDate: endDate,
                      paymentId: payment.id,
                      paymentStatus: "confirmed",
                      quizData: leadData.quizData || pendingPayment.quizData || {},
                      age: leadData.quizData?.age || pendingPayment.quizData?.age,
                      gender: leadData.quizData?.gender || pendingPayment.quizData?.gender,
                      height: leadData.quizData?.height || pendingPayment.quizData?.height,
                      weight: leadData.quizData?.weight || pendingPayment.quizData?.weight,
                      targetWeight: leadData.quizData?.targetWeight || pendingPayment.quizData?.targetWeight,
                      bodyFat: leadData.quizData?.bodyFat || pendingPayment.quizData?.bodyFat,
                      experience: leadData.quizData?.experience || pendingPayment.quizData?.experience,
                      imc: leadData.quizData?.imc || pendingPayment.quizData?.imc,
                      imcClassification:
                        leadData.quizData?.imcClassification || pendingPayment.quizData?.imcClassification,
                      convertedAt: new Date(),
                    })

                    console.log("[v0] Plano renovado para:", existingUserId)

                    try {
                      await db.collection("leads").doc(anonUserId).delete()
                      console.log("[v0] Lead document deleted after updating existing user:", anonUserId)
                    } catch (deleteError) {
                      console.warn("[v0] Erro ao deletar lead document:", deleteError)
                    }
                  }
                } else {
                  throw authError
                }
              }

              await fetch(`${process.env.NEXT_PUBLIC_URL}/api/send-welcome-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: pendingPayment.email,
                  name: pendingPayment.name,
                  password: newPassword,
                  isNewUser: true,
                  planType: pendingPayment.planType,
                }),
              })

              const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/generate-plans-on-demand`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: anonUserId }),
              })

              if (!generateResponse.ok) {
                console.error("[v0] Erro ao gerar planos após pagamento")
              } else {
                console.log("[v0] Planos gerados com sucesso")
              }

              await snapshot.docs[0].ref.delete()
            }
          } catch (error) {
            console.error("[v0] Erro ao processar pagamento confirmado:", error)
          }
        }
        break

      case "PAYMENT_REFUNDED":
        const refundedPayment = body.payment
        console.log("[v0] Pagamento reembolsado:", refundedPayment.id)

        try {
          const usersRef = db.collection("users")
          const userQuery = await usersRef.where("paymentId", "==", refundedPayment.id).limit(1).get()

          if (!userQuery.empty) {
            await userQuery.docs[0].ref.update({
              subscriptionActive: false,
              refundedAt: new Date(),
              refundReason: "Reembolso processado pelo Asaas",
            })
            console.log("[v0] Assinatura cancelada devido ao reembolso")
          }
        } catch (error) {
          console.error("[v0] Erro ao processar reembolso:", error)
        }
        break

      case "PAYMENT_OVERDUE":
        const overduePayment = body.payment
        console.log("[v0] Pagamento vencido:", overduePayment.id)

        try {
          const usersRef = db.collection("users")
          const userQuery = await usersRef.where("paymentId", "==", overduePayment.id).limit(1).get()

          if (!userQuery.empty) {
            await userQuery.docs[0].ref.update({
              paymentStatus: "overdue",
              overdueAt: new Date(),
            })
            console.log("[v0] Status de pagamento atualizado para vencido")
          }
        } catch (error) {
          console.error("[v0] Erro ao atualizar pagamento vencido:", error)
        }
        break

      case "PAYMENT_DELETED":
        const deletedPayment = body.payment
        console.log("[v0] Pagamento cancelado:", deletedPayment.id)

        try {
          const usersRef = db.collection("users")
          const userQuery = await usersRef.where("paymentId", "==", deletedPayment.id).limit(1).get()

          if (!userQuery.empty) {
            await userQuery.docs[0].ref.update({
              subscriptionActive: false,
              deletedAt: new Date(),
              deletionReason: "Pagamento cancelado",
            })
            console.log("[v0] Assinatura desativada")
          }
        } catch (error) {
          console.error("[v0] Erro ao processar pagamento deletado:", error)
        }
        break

      case "SUBSCRIPTION_CREATED":
        const subscription = body.subscription
        console.log("[v0] Assinatura criada:", subscription.id)
        // Lógica adicional se necessário
        break

      case "SUBSCRIPTION_UPDATED":
        const updatedSubscription = body.subscription
        console.log("[v0] Assinatura atualizada:", updatedSubscription.id)
        // Lógica para atualizar status da assinatura
        break

      case "SUBSCRIPTION_DELETED":
        const deletedSubscription = body.subscription
        console.log("[v0] Assinatura deletada:", deletedSubscription.id)

        try {
          const usersRef = db.collection("users")
          const userQuery = await usersRef.where("subscriptionId", "==", deletedSubscription.id).limit(1).get()

          if (!userQuery.empty) {
            await userQuery.docs[0].ref.update({
              subscriptionActive: false,
              subscriptionDeletedAt: new Date(),
            })
            console.log("[v0] Assinatura removida do usuário")
          }
        } catch (error) {
          console.error("[v0] Erro ao processar assinatura deletada:", error)
        }
        break

      case "SUBSCRIPTION_INACTIVATED":
        const inactivatedSubscription = body.subscription
        console.log("[v0] Assinatura inativada:", inactivatedSubscription.id)

        try {
          const usersRef = db.collection("users")
          const userQuery = await usersRef.where("subscriptionId", "==", inactivatedSubscription.id).limit(1).get()

          if (!userQuery.empty) {
            await userQuery.docs[0].ref.update({
              subscriptionActive: false,
              subscriptionInactivatedAt: new Date(),
            })
            console.log("[v0] Assinatura inativada para o usuário")
          }
        } catch (error) {
          console.error("[v0] Erro ao processar assinatura inativada:", error)
        }
        break

      default:
        console.log("[v0] Evento não tratado:", event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] Erro no webhook Asaas:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 400 })
  }
}
