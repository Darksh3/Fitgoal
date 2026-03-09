"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CreditCard,
  Check,
  ShoppingCart,
  User,
  Lock,
  QrCode,
  FileText,
  Smartphone,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Zap,
  Clock,
} from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { motion } from "framer-motion"
import { doc, onSnapshot, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "@/lib/firebaseClient"
import Link from "next/link"
import Image from "next/image"
import { usePixel } from "@/components/pixel-tracker"

interface PaymentFormData {
  email: string
  name: string
  cpf: string
  phone: string
}

interface CardData {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

interface AddressData {
  postalCode: string
  addressNumber: string
}

type PaymentMethod = "pix" | "boleto" | "apple" | "google" | "card"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { trackInitiateCheckout } = usePixel()

  const [user, setUser] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(90)
  const [selectedPlan, setSelectedPlan] = useState<"mensal" | "trimestral" | "semestral">("semestral")
  const [prefillLoading, setPrefillLoading] = useState(false)
  const [spinDiscount, setSpinDiscount] = useState<number | null>(null)
  const [isComplementosOnly, setIsComplementosOnly] = useState(false)

  // Rastrear InitiateCheckout apenas uma vez por sessão (quando a página de checkout carrega)
  useEffect(() => {
    // Verificar se já foi rastreado nesta sessão
    const initiateCheckoutTracked = typeof window !== 'undefined'
      ? sessionStorage.getItem('initiateCheckout_tracked')
      : null

    if (initiateCheckoutTracked) {
      console.log("[v0] InitiateCheckout already tracked this session")
      return
    }

    const planMap: { [key: string]: { name: string; price: number } } = {
      mensal: { name: 'Plano Mensal', price: 79.90 },
      trimestral: { name: 'Plano Trimestral', price: 194.70 },
      semestral: { name: 'Plano Semestral', price: 299.40 },
    }

    const plan = planMap[selectedPlan] || planMap.semestral
    trackInitiateCheckout({
      value: plan.price,
      currency: 'BRL',
      content_name: plan.name,
      content_category: 'plan',
    })

    // Marcar como rastreado para evitar duplicação se o usuário mudar de plano
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('initiateCheckout_tracked', 'true')
      console.log("[v0] InitiateCheckout tracked (checkout page)")
    }
  }, [trackInitiateCheckout])

  const [formData, setFormData] = useState<PaymentFormData>({
    email: "",
    name: "",
    cpf: "",
    phone: "",
  })

  const [cardData, setCardData] = useState<CardData>({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  })

  const [addressData, setAddressData] = useState<AddressData>({
    postalCode: "",
    addressNumber: "",
  })

  const [installments, setInstallments] = useState(1)
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; paymentId: string } | null>(null)
  const [boletoData, setBoletoData] = useState<{ url: string; barCode: string } | null>(null)
  const [cardPaymentId, setCardPaymentId] = useState<string | null>(null)

  // Order Bump state
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<{
    ebook: boolean
    protocolo: boolean
  }>({
    ebook: false,
    protocolo: false,
  })

  const [orderBumpsStatus, setOrderBumpsStatus] = useState<{
    ebook: boolean
    protocolo: boolean
  } | null>(null)

  // Plan info
  const getPlanName = (plan: string) => {
    switch (plan) {
      case "mensal":
        return "Plano Mensal"
      case "trimestral":
        return "Plano Trimestral"
      case "semestral":
        return "Plano Semestral"
      default:
        return "Plano Semestral"
    }
  }

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case "mensal":
        return "79.90"
      case "trimestral":
        return "179.90"
      case "semestral":
        return "239.90"
      default:
        return "239.90"
    }
  }

  const planName = getPlanName(selectedPlan)
  const planPrice = getPlanPrice(selectedPlan)

  // Calculate total with order bumps
  const getTotalPrice = () => {
    const orderBumpValue = (selectedOrderBumps.ebook ? 14.9 : 0) + (selectedOrderBumps.protocolo ? 14.9 : 0)

    // Se é só complementos, retorna apenas o valor deles
    if (isComplementosOnly) {
      console.log("[v0] CHECKOUT - Calculando total APENAS complementos:", orderBumpValue)
      return orderBumpValue.toFixed(2)
    }

    // Senão, adiciona o plano
    const basePlanPrice = parseFloat(planPrice)
    const total = (basePlanPrice + orderBumpValue).toFixed(2)
    console.log("[v0] CHECKOUT - Calculando total COM plano:", { basePlanPrice, orderBumpValue, total })
    return total
  }

  const totalPrice = getTotalPrice()

  useEffect(() => {
    const initialPlan = searchParams.get("planKey") as "mensal" | "trimestral" | "semestral" | null
    if (initialPlan) {
      setSelectedPlan(initialPlan)
    }

    // Verificar se é checkout somente de complementos
    const isComplementosOnlyParam = searchParams.get("complementosOnly") === "true"
    console.log("[v0] CHECKOUT - complementosOnly:", isComplementosOnlyParam)
    setIsComplementosOnly(isComplementosOnlyParam)

    // Se vem da página de complementos-checkout, pré-selecionar os order bumps
    const bumpsParam = searchParams.get("bumps")
    if (bumpsParam) {
      try {
        const bumps = JSON.parse(bumpsParam)
        console.log("[v0] CHECKOUT - Pré-selecionando order bumps:", bumps)
        setSelectedOrderBumps({
          ebook: bumps.ebook === true,
          protocolo: bumps.protocolo === true,
        })
      } catch (error) {
        console.error("[v0] CHECKOUT - Erro ao parsear bumps:", error)
      }
    }
  }, [searchParams])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      // Buscar dados do usuário e pré-preencher formulário
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data()
            console.log("[v0] CHECKOUT - Dados do usuário:", userData)

            // Pré-preencher formulário com dados salvos
            setFormData((prev) => ({
              ...prev,
              email: userData.email || currentUser.email || "",
              name: userData.name || "",
              phone: userData.phone || userData.personalData?.phone || "",
              cpf: userData.cpf || "",
            }))

            // Pré-preencher nome do titular do cartão
            if (userData.name) {
              setCardData((prev) => ({
                ...prev,
                holderName: userData.name,
              }))
            }
          } else {
            // Se não existe documento, preencher com dados do Firebase Auth
            setFormData((prev) => ({
              ...prev,
              email: currentUser.email || "",
            }))
          }
        } catch (error) {
          console.error("[v0] CHECKOUT - Erro ao buscar dados do usuário:", error)
        }

        // Buscar status dos order bumps
        const checkOrderBumps = async () => {
          try {
            const response = await fetch("/api/check-order-bumps-purchased", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: currentUser.uid }),
            })

            if (response.ok) {
              const data = await response.json()
              setOrderBumpsStatus({
                ebook: data.ebook === true,
                protocolo: data.protocolo === true,
              })
              console.log("[v0] CHECKOUT - Order bumps status:", data)
            }
          } catch (error) {
            console.error("[v0] CHECKOUT - Erro ao buscar order bumps status:", error)
          }
        }
        checkOrderBumps()
      }
    })
    return () => unsubscribe()
  }, [])

  // Check for spin discount from wheel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const spinData = localStorage.getItem('spinDiscount')
      if (spinData) {
        try {
          const { discount } = JSON.parse(spinData)
          setSpinDiscount(discount)
        } catch (e) {
          console.log('[v0] Erro ao ler spinDiscount:', e)
        }
      }
    }
  }, [])

  // Prefill form data from quiz or profile on page load
  useEffect(() => {
    prefillFromProfile()
  }, [])

  // Real-time payment listener
  useEffect(() => {
    // For PIX and Card - listen to specific payment ID
    const currentPaymentId = pixData?.paymentId || cardPaymentId
    const method = pixData?.paymentId ? "pix" : cardPaymentId ? "card" : null

    if (!currentPaymentId || !method) {
      console.log("[v0] PAYMENT_LISTENER_SETUP - Nenhum paymentId configurado ainda")
      return
    }

    console.log("[v0] PAYMENT_LISTENER_SETUP - Configurando listener para:", { currentPaymentId, method })

    const paymentRef = doc(db, "payments", currentPaymentId)
    let unsubscribeRef: any = null

    const unsubscribe = onSnapshot(paymentRef, (snapshot) => {
      console.log("[v0] PAYMENT_LISTENER - Snapshot recebido para:", currentPaymentId)

      if (!snapshot.exists()) {
        console.log("[v0] PAYMENT_LISTENER - Documento de pagamento não existe ainda")
        return
      }

      const paymentData = snapshot.data()
      console.log("[v0] PAYMENT_LISTENER - Status do pagamento:", paymentData?.status, "para:", currentPaymentId)

      // Se pagamento foi confirmado pelo webhook da Asaas
      if (paymentData?.status === "RECEIVED" || paymentData?.status === "CONFIRMED") {
        console.log("[v0] PAYMENT_CONFIRMED - Pagamento confirmado! Acionando feedback visual")
        setSuccess(true)
        console.log("[v0] PAYMENT_CONFIRMED - Desinstalando listener")
        if (unsubscribeRef) {
          unsubscribeRef()
        }
      } else {
        console.log("[v0] PAYMENT_LISTENER - Status não confirmado, aguardando webhook...")
      }
    }, (error) => {
      console.error("[v0] PAYMENT_LISTENER - Erro ao escutar:", error)
    })

    unsubscribeRef = unsubscribe

    return () => {
      console.log("[v0] PAYMENT_LISTENER - Limpando listener para:", currentPaymentId)
      unsubscribe()
    }
  }, [pixData?.paymentId, cardPaymentId])

  // Countdown redirect
  useEffect(() => {
    if (success && redirectCountdown > 0) {
      const timer = setTimeout(() => setRedirectCountdown(redirectCountdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (success && redirectCountdown === 0) {
      router.push("/dashboard")
    }
  }, [success, redirectCountdown, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof PaymentFormData) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof CardData) => {
    let value = e.target.value
    if (field === "number") {
      value = value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim()
    }
    setCardData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof AddressData) => {
    setAddressData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) return "name"
    if (!formData.email.trim()) return "email"
    if (!formData.cpf.replace(/\D/g, "")) return "cpf"
    if (!formData.phone.replace(/\D/g, "")) return "phone"

    if (paymentMethod === "card") {
      if (!cardData.number.replace(/\D/g, "")) return "cardNumber"
      if (!cardData.expiryMonth || !cardData.expiryYear) return "cardExpiry"
      if (!cardData.ccv) return "cardCcv"
      if (!cardData.holderName) return "cardHolder"
      if (!addressData.postalCode) return "postalCode"
      if (!addressData.addressNumber) return "addressNumber"
    }

    if (paymentMethod === "boleto") {
      if (!addressData.postalCode) return "postalCode"
      if (!addressData.addressNumber) return "addressNumber"
    }

    return null
  }

  const getFieldError = (field: string) => error === field

  const getErrorMessage = () => {
    const errorMessages: Record<string, string> = {
      name: "Nome é obrigatório",
      email: "Email é obrigatório",
      cpf: "CPF é obrigatório",
      phone: "Telefone é obrigatório",
      cardNumber: "Número do cartão é obrigatório",
      cardExpiry: "Validade é obrigatória",
      cardCcv: "CVV é obrigatório",
      cardHolder: "Nome no cartão é obrigatório",
      postalCode: "CEP é obrigatório",
      addressNumber: "Número da residência é obrigatório",
    }
    return errorMessages[error as string] || error
  }

  const prefillFromProfile = async () => {
    // First priority: Try to get from quiz data in localStorage
    if (typeof window !== 'undefined') {
      const quizDataStr = localStorage.getItem("quizData")
      if (quizDataStr) {
        try {
          const quizData = JSON.parse(quizDataStr)
          setFormData((prev) => ({
            ...prev,
            email: prev.email || quizData.email || "",
            name: prev.name || quizData.name || "",
            cpf: prev.cpf || quizData.cpf || "",
            phone: prev.phone || quizData.phone || "",
          }))
          return // If quiz data exists, return early - no need to query Firestore
        } catch (e) {
          console.log("[v0] Erro ao ler quizData:", e)
        }
      }
    }

    // Second priority: Try to get from Firestore user profile
    if (!user) return
    setPrefillLoading(true)

    try {
      const ref = doc(db, "users", user.uid)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        const data = snap.data() as any

        setFormData((prev) => ({
          ...prev,
          email: prev.email || data.email || user.email || "",
          name: prev.name || data.name || user.displayName || "",
          cpf: prev.cpf || data.cpf || "",
          phone: prev.phone || data.phone || data.personalData?.phone || data.phone || "",
        }))
      } else {
        // If no Firestore document, use Firebase Auth
        setFormData((prev) => ({
          ...prev,
          email: prev.email || user.email || "",
          name: prev.name || user.displayName || "",
        }))
      }
    } catch (err) {
      console.log("[v0] Erro ao buscar perfil:", err)
    } finally {
      setPrefillLoading(false)
    }
  }

  const handlePayment = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setProcessing(true)
    setError(null)

    try {
      // Validação de campos específicos por método
      const missingFields = []
      if (!formData.email?.trim()) missingFields.push("Email")
      if (!formData.name?.trim()) missingFields.push("Nome Completo")
      if (!formData.cpf?.trim()) missingFields.push("CPF")
      if (!formData.phone?.trim()) missingFields.push("Telefone")

      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(", ")}`)
      }

      if (paymentMethod === "card") {
        const cardMissingFields = []
        if (!cardData.holderName?.trim()) cardMissingFields.push("Nome no Cartão")
        if (!cardData.number?.replace(/\s/g, "")) cardMissingFields.push("Número do Cartão")
        if (!cardData.expiryMonth) cardMissingFields.push("Mês de Validade")
        if (!cardData.expiryYear) cardMissingFields.push("Ano de Validade")
        if (!cardData.ccv) cardMissingFields.push("CVV")
        if (!addressData.postalCode?.replace(/\D/g, "")) cardMissingFields.push("CEP")
        if (!addressData.addressNumber?.trim()) cardMissingFields.push("Número do Endereço")

        if (cardMissingFields.length > 0) {
          throw new Error(`Campos do cartão faltando: ${cardMissingFields.join(", ")}`)
        }
      }

      // Step 1: Criar pagamento com /api/create-asaas-payment (igual ao modal)
      // Get uid from localStorage quizData first, then fallback to Firebase Auth
      const stored = localStorage.getItem("quizData")
      const storedUid = stored ? JSON.parse(stored).uid : null
      const finalClientUid = storedUid || user?.uid

      const paymentPayload: Record<string, any> = {
        email: formData.email,
        name: formData.name,
        cpf: formData.cpf.replace(/\D/g, ""),
        phone: formData.phone.replace(/\D/g, ""),
        paymentMethod: paymentMethod === "card" ? "card" : paymentMethod,
        clientUid: finalClientUid,
        totalPrice: totalPrice, // Total including order bumps
      }

      // Apenas adicione planType e planPrice se NÃO for apenas complementos
      if (!isComplementosOnly) {
        paymentPayload.planType = selectedPlan
        paymentPayload.planPrice = planPrice
        paymentPayload.description = `${planName} - Fitgoal Fitness`
      } else {
        paymentPayload.description = "Complementos - Fitgoal Fitness"
      }

      // Add order bumps to payload if selected
      if (selectedOrderBumps.ebook || selectedOrderBumps.protocolo) {
        paymentPayload.orderBumps = {
          ebook: selectedOrderBumps.ebook,
          protocolo: selectedOrderBumps.protocolo,
        }
      }

      if (paymentMethod === "card") {
        paymentPayload.installments = installments || 1
      }

      if (paymentMethod === "boleto" || paymentMethod === "card") {
        if (addressData.postalCode) {
          paymentPayload.postalCode = addressData.postalCode.replace(/\D/g, "")
        }
        if (addressData.addressNumber) {
          paymentPayload.addressNumber = addressData.addressNumber
        }
      }

      if (paymentMethod === "card") {
        paymentPayload.cardData = {
          holderName: cardData.holderName,
          number: cardData.number?.replace(/\s/g, ""),
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv,
        }
      }

      console.log("[v0] Enviando para /api/create-asaas-payment:", paymentPayload)
      const paymentResponse = await fetch("/api/create-asaas-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        console.log("[v0] Erro da API:", errorData)
        throw new Error(errorData.error || "Erro ao criar cobrança")
      }

      const paymentResult = await paymentResponse.json()
      console.log("[v0] Pagamento criado:", paymentResult)

      if (paymentMethod === "pix") {
        localStorage.setItem("lastPaymentId", paymentResult.paymentId)

        // Nota: O documento de pagamento é criado pelo servidor via Admin SDK
        // O cliente apenas lê/escuta o status via onSnapshot

        // Buscar QR Code
        const qrCodeResponse = await fetch(`/api/get-pix-qrcode?paymentId=${paymentResult.paymentId}`)

        if (qrCodeResponse.ok) {
          const qrCodeResult = await qrCodeResponse.json()
          setPixData({
            qrCode: qrCodeResult.encodedImage || qrCodeResult.qrCode,
            copyPaste: qrCodeResult.payload,
            paymentId: paymentResult.paymentId,
          })
        } else {
          setPixData({
            qrCode: paymentResult.pixQrCode,
            copyPaste: paymentResult.pixCopyPaste,
            paymentId: paymentResult.paymentId,
          })
        }

        setProcessing(false)
        return
      }

      if (paymentMethod === "boleto") {
        setBoletoData({
          url: paymentResult.boletoUrl,
          barCode: paymentResult.boletoBarCode,
        })
        setProcessing(false)
        return
      }

      if (paymentMethod === "card") {
        const cardPayload = {
          paymentId: paymentResult.paymentId,
          creditCard: {
            holderName: cardData.holderName,
            number: cardData.number.replace(/\s/g, ""),
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            ccv: cardData.ccv,
          },
          creditCardHolderInfo: {
            name: formData.name,
            email: formData.email,
            cpfCnpj: formData.cpf.replace(/\D/g, ""),
            postalCode: addressData.postalCode.replace(/\D/g, ""),
            addressNumber: addressData.addressNumber,
            phone: formData.phone.replace(/\D/g, ""),
          },
        }

        console.log("[v0] Processando cartão com /api/process-asaas-card")
        const cardResponse = await fetch("/api/process-asaas-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cardPayload),
        })

        if (!cardResponse.ok) {
          const errorData = await cardResponse.json()
          console.log("[v0] Erro ao processar cartão:", errorData)
          throw new Error(errorData.error || "Erro ao processar cartão")
        }

        // Nota: O documento de pagamento é criado pelo servidor via Admin SDK
        // O cliente apenas lê/escuta o status via onSnapshot
        setCardPaymentId(paymentResult.paymentId)

        setProcessing(false)
        return
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao processar pagamento"
      console.log("[v0] Erro capturado:", errorMsg)
      setError(errorMsg)
      setProcessing(false)
    }
  }

  // Listen for card payment status and redirect on success
  useEffect(() => {
    if (!cardPaymentId) return

    console.log("[v0] Setting up listener for card payment:", cardPaymentId)

    const unsubscribe = onSnapshot(doc(db, "payments", cardPaymentId), (snapshot) => {
      if (!snapshot.exists()) return

      const paymentData = snapshot.data()
      console.log("[v0] Payment status received:", paymentData?.status)

      if (paymentData?.status === "CONFIRMED" || paymentData?.status === "RECEIVED") {
        console.log("[v0] Payment confirmed! Redirecting to success...")
        setSuccess(true)
      } else if (paymentData?.status === "FAILED" || paymentData?.status === "OVERDUE") {
        console.log("[v0] Payment failed:", paymentData?.status)
        setError("Pagamento recusado. Por favor, tente novamente.")
        setCardPaymentId(null)
        setProcessing(false)
      }
    })

    return () => unsubscribe()
  }, [cardPaymentId])

  // Success screen - Redirect to success page
  useEffect(() => {
    if (success) {
      // Get the payment ID and user ID based on payment method
      const currentPaymentId = pixData?.paymentId || cardPaymentId
      const stored = localStorage.getItem("quizData")
      const storedUid = stored ? JSON.parse(stored).uid : null
      const userId = storedUid || user?.uid || ""

      console.log("[v0] SUCCESS REDIRECT - paymentId:", currentPaymentId, "userId:", userId)

      setTimeout(() => {
        // Pass paymentId and userId to success page so it can call handle-post-checkout
        if (currentPaymentId && userId) {
          router.push(`/success?embedded=true&paymentId=${encodeURIComponent(currentPaymentId)}&userId=${encodeURIComponent(userId)}`)
        } else if (currentPaymentId) {
          router.push(`/success?embedded=true&paymentId=${encodeURIComponent(currentPaymentId)}`)
        } else {
          router.push("/success?embedded=true")
        }
      }, 1000) // Small delay to ensure data is saved
    }
  }, [success, router, pixData?.paymentId, cardPaymentId, user?.uid])

  // Boleto screen
  if (boletoData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-md w-full">
          <Card className="bg-slate-800/40 backdrop-blur border-slate-700/50">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <FileText className="w-12 h-12 text-lime-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Pagar com Boleto</h2>
              </div>

              <div className="bg-slate-700/30 p-4 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Código de barras:</p>
                <code className="text-white font-mono text-sm break-all">{boletoData.barCode}</code>
              </div>

              <Button asChild className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold">
                <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                  Acessar Boleto
                </a>
              </Button>

              <p className="text-xs text-gray-400 text-center">Você será redirecionado para visualizar e pagar o boleto</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Main checkout screen - Two Column Layout
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl space-y-8">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center mb-4">
          <Image src="/fitgoal-logo.webp" alt="FitGoal Logo" width={200} height={80} className="mx-auto" priority />
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Finalizar sua inscrição</h1>
        </motion.div>

        {/* Discount Banner - Shows only if user spun the wheel */}
        {spinDiscount && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-r from-lime-600/20 to-lime-500/20 border-2 border-lime-500/60 rounded-lg p-4 text-center"
          >
            <p className="text-white text-lg font-semibold">
              Desconto de <span className="text-lime-400">{spinDiscount}%</span> aplicado ao seu pedido!
            </p>
          </motion.div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Order Summary */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white mb-4">Resumo do Pedido</h3>

                {/* Plan Selector - Hidden if complementos only */}
                {!isComplementosOnly && (
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <button
                      onClick={() => setSelectedPlan("mensal")}
                      className={`p-2 rounded-lg border-2 transition-all text-center relative ${selectedPlan === "mensal"
                        ? "border-lime-500 bg-lime-500/10"
                        : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                        }`}
                    >
                      {spinDiscount && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-lime-500 px-2 py-0.5 rounded text-xs font-bold text-black">
                          -{spinDiscount}%
                        </div>
                      )}
                      <div className={`text-xs font-semibold ${selectedPlan === "mensal" ? "text-lime-400" : "text-gray-300"}`}>Mensal</div>
                      <div className={`text-sm font-bold ${selectedPlan === "mensal" ? "text-lime-400" : "text-gray-400"}`}>R$ 79,90</div>
                    </button>

                    <button
                      onClick={() => setSelectedPlan("trimestral")}
                      className={`p-2 rounded-lg border-2 transition-all text-center relative ${selectedPlan === "trimestral"
                        ? "border-lime-500 bg-lime-500/10"
                        : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                        }`}
                    >
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-lime-500 px-2 py-0.5 rounded text-xs font-bold text-black">
                        {spinDiscount ? `-${spinDiscount}%` : `-25%`}
                      </div>
                      <div className={`text-xs font-semibold ${selectedPlan === "trimestral" ? "text-lime-400" : "text-gray-300"}`}>Trimestral</div>
                      <div className={`text-sm font-bold ${selectedPlan === "trimestral" ? "text-lime-400" : "text-gray-400"}`}>R$ 179,90</div>
                    </button>

                    <button
                      onClick={() => setSelectedPlan("semestral")}
                      className={`p-2 rounded-lg border-2 transition-all text-center relative ${selectedPlan === "semestral"
                        ? "border-lime-500 bg-lime-500/10"
                        : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                        }`}
                    >
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-lime-500 px-2 py-0.5 rounded text-xs font-bold text-black">
                        {spinDiscount ? `-${spinDiscount}%` : `-40%`}
                      </div>
                      <div className={`text-xs font-semibold ${selectedPlan === "semestral" ? "text-lime-400" : "text-gray-300"}`}>Semestral</div>
                      <div className={`text-sm font-bold ${selectedPlan === "semestral" ? "text-lime-400" : "text-gray-400"}`}>R$ 239,90</div>
                    </button>
                  </div>
                )}

                {/* Plan Details - Hidden if complementos only */}
                {!isComplementosOnly && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-200">
                      <Check className="w-4 h-4 text-lime-500" />
                      <span className="font-semibold">{planName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-lime-500" />
                      <span>{selectedPlan === "mensal" ? "1 mês" : selectedPlan === "trimestral" ? "3 meses" : "6 meses"} de treino e dieta personalizada baseados no seu objetivo</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-lime-500" />
                      <span>Exercícios com séries, repetições e descanso definidos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-lime-500" />
                      <span>Ajustes automáticos conforme sua evolução</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-lime-500" />
                      <span>Acesso Completo ao App + Acompanhamento Contínuo durante todo o plano</span>
                    </div>
                  </div>
                )}

                {/* Complementos - Show only if complementos only */}
                {isComplementosOnly && (
                  <div className="space-y-2 mb-4">
                    {selectedOrderBumps.ebook && (
                      <div className="flex items-center gap-2 text-gray-200">
                        <Check className="w-4 h-4 text-lime-500" />
                        <span className="font-semibold">Protocolo Anti-Plateau</span>
                      </div>
                    )}
                    {selectedOrderBumps.protocolo && (
                      <div className="flex items-center gap-2 text-gray-200">
                        <Check className="w-4 h-4 text-lime-500" />
                        <span className="font-semibold">Protocolo S.O.S FitGoal</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-slate-600 pt-4 flex justify-between items-center">
                  <span className="text-gray-300">Total</span>
                  <span className="text-3xl font-bold text-lime-500">R$ {parseFloat(totalPrice).toFixed(2).replace(".", ",")}</span>
                </div>
                {!isComplementosOnly && (
                  <div className="text-sm text-gray-400 mt-2">
                    {selectedPlan === "mensal" && "R$ 79,90 por mês"}
                    {selectedPlan === "trimestral" && "R$ 59,97 por mês"}
                    {selectedPlan === "semestral" && "Menos de R$40 por mês!"}
                  </div>
                )}
              </div>

              {/* Guarantee */}
              <div className="bg-lime-500/10 p-4 rounded-lg border border-lime-500/30 flex gap-3">
                <Shield className="w-6 h-6 text-lime-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-lime-300">Garantia 30 Dias</p>
                  <p className="text-sm text-lime-200">Satisfação 100% ou seu dinheiro de volta.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Payment Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="space-y-4">
              {/* Payment Methods */}
              <div>
                <h3 className="font-semibold text-white mb-4">Escolha a forma de pagamento</h3>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={async () => {
                      setPaymentMethod("pix")
                      setError(null)
                      await prefillFromProfile()
                    }}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === "pix" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                      }`}
                  >
                    <QrCode className={`w-5 h-5 ${paymentMethod === "pix" ? "text-lime-400" : "text-gray-400"}`} />
                    <span className={`text-sm font-semibold ${paymentMethod === "pix" ? "text-lime-400" : "text-gray-300"}`}>Pagar com Pix</span>
                  </button>

                  <button
                    onClick={async () => {
                      setPaymentMethod("boleto")
                      setError(null)
                      await prefillFromProfile()
                    }}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${paymentMethod === "boleto" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                      }`}
                  >
                    <FileText className={`w-5 h-5 ${paymentMethod === "boleto" ? "text-lime-400" : "text-gray-400"}`} />
                    <span className={`text-sm font-semibold ${paymentMethod === "boleto" ? "text-lime-400" : "text-gray-300"}`}>Boleto</span>
                  </button>
                </div>

                {/* Or card payment */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 border-t border-slate-600"></div>
                  <span className="text-xs text-gray-400">Ou pague com cartão</span>
                  <div className="flex-1 border-t border-slate-600"></div>
                </div>

                <button
                  onClick={async () => {
                    setPaymentMethod("card")
                    setError(null)
                    await prefillFromProfile()
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-3 mb-3 ${paymentMethod === "card" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === "card" ? "text-lime-400" : "text-gray-400"}`} />
                  <span className={`font-semibold ${paymentMethod === "card" ? "text-lime-400" : "text-gray-300"}`}>Cartão de Crédito</span>
                </button>
              </div>

              {/* Personal Info Fields - Show only after payment method selected */}
              {paymentMethod && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  {/* Dynamic instruction text */}
                  <p className="text-sm text-gray-300 mb-2 text-center">
                    {paymentMethod === "pix" && "🎯 Falta pouco para liberar seu plano personalizado!"}
                    {paymentMethod === "boleto" && "🎯 Falta pouco para liberar seu plano personalizado!"}
                    {paymentMethod === "card" && "🎯 Falta pouco para liberar seu plano personalizado!"}
                  </p>

                  <Input
                    placeholder="Nome Completo"
                    value={formData.name}
                    onChange={(e) => handleInputChange(e, "name")}
                    className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("name") ? "border-red-500/80 border-2" : "border-slate-600"
                      }`}
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange(e, "email")}
                    className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("email") ? "border-red-500/80 border-2" : "border-slate-600"
                      }`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="CPF"
                      value={formData.cpf}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "")
                        // Format apenas se houver dígitos, permitindo backspace livre
                        if (value.length > 0) {
                          if (value.length <= 3) {
                            // Sem formatação para 1-3 dígitos
                          } else if (value.length <= 6) {
                            value = value.slice(0, 3) + "." + value.slice(3)
                          } else if (value.length <= 9) {
                            value = value.slice(0, 3) + "." + value.slice(3, 6) + "." + value.slice(6)
                          } else {
                            value = value.slice(0, 3) + "." + value.slice(3, 6) + "." + value.slice(6, 9) + "-" + value.slice(9, 11)
                          }
                        }
                        handleInputChange({ target: { value } } as any, "cpf")
                      }}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("cpf") ? "border-red-500/80 border-2" : "border-slate-600"
                        }`}
                    />
                    <Input
                      placeholder="Telefone"
                      value={formData.phone}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "")
                        // Format apenas se houver dígitos, permitindo backspace livre
                        if (value.length > 0) {
                          if (value.length <= 2) {
                            // Sem formatação para 1-2 dígitos
                          } else if (value.length <= 7) {
                            value = "(" + value.slice(0, 2) + ") " + value.slice(2)
                          } else {
                            value = "(" + value.slice(0, 2) + ") " + value.slice(2, 7) + "-" + value.slice(7, 11)
                          }
                        }
                        handleInputChange({ target: { value } } as any, "phone")
                      }}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("phone") ? "border-red-500/80 border-2" : "border-slate-600"
                        }`}
                    />
                  </div>
                </motion.div>
              )}

              {/* Boleto Fields - CEP and Address Number */}
              {paymentMethod === "boleto" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="CEP"
                      value={addressData.postalCode}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "")
                        if (value.length > 5) {
                          value = value.slice(0, 5) + "-" + value.slice(5, 8)
                        }
                        handleAddressChange({ target: { value } } as any, "postalCode")
                      }}
                      maxLength={9}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("postalCode") ? "border-red-500/80 border-2" : "border-slate-600"
                        }`}
                    />
                    <Input
                      placeholder="Número da Residência"
                      value={addressData.addressNumber}
                      onChange={(e) => handleAddressChange(e, "addressNumber")}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("addressNumber") ? "border-red-500/80 border-2" : "border-slate-600"
                        }`}
                    />
                  </div>
                </motion.div>
              )}

              {/* Card Fields */}
              {paymentMethod === "card" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3">
                  <Input
                    placeholder="Número do Cartão"
                    value={cardData.number}
                    onChange={(e) => handleCardChange(e, "number")}
                    maxLength={19}
                    className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 font-mono ${getFieldError("cardNumber") ? "border-red-500/80 border-2" : "border-slate-600"
                      }`}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      placeholder="Validade (MM)"
                      value={cardData.expiryMonth}
                      onChange={(e) => handleCardChange(e, "expiryMonth")}
                      maxLength={2}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("cardExpiry") ? "border-red-500/80 border-2" : "border-slate-600"
                        }`}
                    />
                    <Input
                      placeholder="Ano (YYYY)"
                      value={cardData.expiryYear}
                      onChange={(e) => handleCardChange(e, "expiryYear")}
                      maxLength={4}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("cardExpiry") ? "border-red-500/80 border-2" : "border-slate-600"
                        }`}
                    />
                    <Input
                      placeholder="CVV"
                      value={cardData.ccv}
                      onChange={(e) => handleCardChange(e, "ccv")}
                      maxLength={4}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("cardCcv") ? "border-red-500/80 border-2" : "border-slate-600"
                        }`}
                    />
                  </div>
                  <Input
                    placeholder="Nome no Cartão"
                    value={cardData.holderName}
                    onChange={(e) => handleCardChange(e, "holderName")}
                    className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("cardHolder") ? "border-red-500/80 border-2" : "border-slate-600"
                      }`}
                  />

                  {/* Address Fields for Card */}
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="CEP"
                      value={addressData.postalCode}
                      onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      maxLength={8}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("postalCode") ? "border-red-500/80 border-2" : "border-slate-600"}`}
                    />
                    <Input
                      placeholder="Número da Residência"
                      value={addressData.addressNumber}
                      onChange={(e) => setAddressData({ ...addressData, addressNumber: e.target.value })}
                      className={`bg-slate-700/40 text-white placeholder:text-slate-400 placeholder:opacity-100 ${getFieldError("addressNumber") ? "border-red-500/80 border-2" : "border-slate-600"}`}
                    />
                  </div>

                  <select
                    value={installments}
                    onChange={(e) => setInstallments(parseInt(e.target.value))}
                    className="w-full bg-slate-700/40 border border-slate-600 text-white rounded-md px-3 py-2 placeholder:text-slate-400 placeholder:opacity-100"
                  >
                    {/* Complementos Only - Limitar parcelamento */}
                    {isComplementosOnly ? (
                      <>
                        <option value={1} className="bg-slate-800">
                          1x de R$ {parseFloat(totalPrice).toFixed(2).replace(".", ",")}
                        </option>
                        {/* Permitir 2x apenas se total >= R$ 29.90 (2 complementos) */}
                        {parseFloat(totalPrice) >= 29.80 && (
                          <option value={2} className="bg-slate-800">
                            2x de R$ {(parseFloat(totalPrice) / 2).toFixed(2).replace(".", ",")}
                          </option>
                        )}
                      </>
                    ) : (
                      <>
                        {selectedPlan === "semestral" && [1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n} className="bg-slate-800">
                            {n}x de R$ {(parseFloat(totalPrice) / n).toFixed(2).replace(".", ",")}</option>
                        ))}
                        {selectedPlan === "trimestral" && [1, 2, 3].map((n) => (
                          <option key={n} value={n} className="bg-slate-800">
                            {n}x de R$ {(parseFloat(totalPrice) / n).toFixed(2).replace(".", ",")}</option>
                        ))}
                        {selectedPlan === "mensal" && (
                          <option value={1} className="bg-slate-800">
                            1x de R$ {parseFloat(totalPrice).toFixed(2).replace(".", ",")}</option>
                        )}
                      </>
                    )}
                  </select>

                  {/* Sugestão de parcelamento condicional */}
                  {!isComplementosOnly && selectedPlan === "semestral" && (
                    <div className="text-xs text-lime-400 text-center">
                      ou até 6x de R$ {(parseFloat(totalPrice) / 6).toFixed(2).replace(".", ",")}
                    </div>
                  )}
                  {!isComplementosOnly && selectedPlan === "trimestral" && (
                    <div className="text-xs text-lime-400 text-center">
                      ou até 3x de R$ {(parseFloat(totalPrice) / 3).toFixed(2).replace(".", ",")}
                    </div>
                  )}
                  {isComplementosOnly && parseFloat(totalPrice) >= 29.80 && (
                    <div className="text-xs text-lime-400 text-center">
                      ou até 2x de R$ {(parseFloat(totalPrice) / 2).toFixed(2).replace(".", ",")}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Error Message - Mais orientador */}
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-300 text-sm font-semibold">⚠️ Precisamos de algumas informações</p>
                      <p className="text-red-300/80 text-xs mt-1">{getErrorMessage()}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Espaço extra antes do botão em mobile */}
              <div className="h-4 md:h-0" />

              {/* ORDER BUMP SECTION - Show only if payment method is selected */}
              {paymentMethod && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-amber-50 border-2 border-dashed border-rose-400 rounded-xl overflow-hidden space-y-0"
                >
                  {/* Header Banner - Rose/Pink */}
                  <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4">
                    <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                      🎁 Você tem 2 ofertas especiais!
                    </h3>
                  </div>

                  {/* Content Area */}
                  <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-700 text-center">Uma oportunidade única de adquirir produtos incríveis com super desconto</p>

                    {/* Order Bump Products - Vertical Stack */}
                    <div className="space-y-3">
                      {/* Ebook Anti-Plateau */}
                      <motion.div
                        whileHover={{ scale: orderBumpsStatus?.ebook ? 1 : 1.01 }}
                        onClick={() => {
                          if (!orderBumpsStatus?.ebook) {
                            setSelectedOrderBumps(prev => ({ ...prev, ebook: !prev.ebook }))
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all relative ${orderBumpsStatus?.ebook
                            ? "bg-gray-200 border-gray-400 cursor-not-allowed opacity-60"
                            : selectedOrderBumps.ebook
                              ? "bg-lime-500/15 border-lime-500/50 cursor-pointer"
                              : "bg-white/40 border-gray-300 hover:border-gray-400 cursor-pointer"
                          }`}
                      >
                        {/* Status Badge */}
                        {orderBumpsStatus?.ebook && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                            Já comprado
                          </div>
                        )}

                        {/* Checkbox - Top Right */}
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${orderBumpsStatus?.ebook
                            ? "bg-blue-500 border-blue-500"
                            : selectedOrderBumps.ebook
                              ? "bg-lime-500 border-lime-500"
                              : "border-gray-500"
                          }`}>
                          {(orderBumpsStatus?.ebook || selectedOrderBumps.ebook) && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Product Image - Small */}
                        <img
                          src="/order-bump-protocol-metabolico.jpg"
                          alt="Ebook Anti-Plateau"
                          className="w-20 h-28 object-cover rounded flex-shrink-0"
                        />

                        {/* Text Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-black text-sm">Protocolo Anti-Plateau</p>
                          <p className="text-xs text-gray-600 line-clamp-2">Reverta a estagnação de peso em 7 dias com protocolos comprovados</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-bold text-lime-500 text-sm">R$ 14,90</span>
                            <span className="text-xs text-gray-500 line-through">R$ 39,90</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Protocolo SOS */}
                      <motion.div
                        whileHover={{ scale: orderBumpsStatus?.protocolo ? 1 : 1.01 }}
                        onClick={() => {
                          if (!orderBumpsStatus?.protocolo) {
                            setSelectedOrderBumps(prev => ({ ...prev, protocolo: !prev.protocolo }))
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all relative ${orderBumpsStatus?.protocolo
                            ? "bg-gray-200 border-gray-400 cursor-not-allowed opacity-60"
                            : selectedOrderBumps.protocolo
                              ? "bg-lime-500/15 border-lime-500/50 cursor-pointer"
                              : "bg-white/40 border-gray-300 hover:border-gray-400 cursor-pointer"
                          }`}
                      >
                        {/* Status Badge */}
                        {orderBumpsStatus?.protocolo && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                            Já comprado
                          </div>
                        )}

                        {/* Checkbox - Top Right */}
                        <div className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${orderBumpsStatus?.protocolo
                            ? "bg-blue-500 border-blue-500"
                            : selectedOrderBumps.protocolo
                              ? "bg-lime-500 border-lime-500"
                              : "border-gray-500"
                          }`}>
                          {(orderBumpsStatus?.protocolo || selectedOrderBumps.protocolo) && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Product Image - Small */}
                        <img
                          src="/order-bump-protocolo-sos.jpg"
                          alt="Protocolo SOS FitGoal"
                          className={`w-20 h-28 object-cover rounded flex-shrink-0 ${orderBumpsStatus?.protocolo ? "grayscale" : ""}`}
                        />

                        {/* Text Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-black text-sm">Protocolo S.O.S FitGoal</p>
                          <p className="text-xs text-gray-600 line-clamp-2">Protocolo de emergência para caso deslize na dieta</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-bold text-lime-500 text-sm">R$ 14,90</span>
                            <span className="text-xs text-gray-500 line-through">R$ 39,90</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Order Bump Summary */}
                    {(selectedOrderBumps.ebook || selectedOrderBumps.protocolo) && (
                      <div className="bg-white/50 rounded-lg p-3 space-y-2 border border-amber-200">
                        {/* Valor do Plano - Hidden if complementos only */}
                        {!isComplementosOnly && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-700">Valor do Plano</span>
                            <span className="text-slate-800 font-semibold">R$ {planPrice}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-700">Promoções Exclusivas Selecionadas</span>
                          <span className="text-rose-600 font-semibold">
                            + R$ {((selectedOrderBumps.ebook ? 14.9 : 0) + (selectedOrderBumps.protocolo ? 14.9 : 0)).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                        <div className="border-t border-amber-200 pt-2 flex justify-between">
                          <span className="text-slate-800 font-bold">Valor Total</span>
                          <span className="text-rose-600 font-bold text-lg">
                            R$ {totalPrice}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Secure Payment Container - Menos densidade - WRAPPER MOVED HERE */}
              <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 md:p-8 space-y-5">

                {/* PIX Payment Display - Inline */}
                {paymentMethod === "pix" && pixData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 space-y-4"
                  >
                    <div className="text-center mb-4">
                      <p className="text-white font-semibold mb-2">QR Code Pix</p>
                      {pixData.qrCode ? (
                        <img
                          src={pixData.qrCode.startsWith('data:') ? pixData.qrCode : `data:image/png;base64,${pixData.qrCode}`}
                          alt="QR Code Pix"
                          className="w-40 h-40 mx-auto"
                        />
                      ) : (
                        <div className="w-40 h-40 mx-auto bg-gray-700 rounded flex items-center justify-center text-sm text-gray-400">
                          Carregando QR Code...
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => navigator.clipboard.writeText(pixData.copyPaste)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                    >
                      Copiar Código Pix
                    </Button>
                  </motion.div>
                )}

                {/* Botão com glow neon verde - APÓS ORDER BUMPS */}
                <div className="w-full max-w-md mx-auto">
                  <button
                    onClick={handlePayment}
                    disabled={!paymentMethod || processing}
                    className={[
                      "w-full relative overflow-hidden rounded-2xl py-5 px-8",
                      "text-white font-bold text-lg tracking-wide",
                      "bg-green-500",
                      "shadow-[0_0_24px_rgba(34,197,94,0.35),0_6px_20px_rgba(0,0,0,0.15)]",
                      "border border-green-400/40",
                      "active:translate-y-[2px] active:scale-[0.98]",
                      "transition-all duration-200",
                      "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
                      "hover:brightness-110",
                    ].join(" ")}
                  >
                    {/* Linha de brilho no topo */}
                    <span className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-green-300/70 to-transparent" />

                    {/* Brilho interno superior */}
                    <span className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent rounded-t-2xl" />

                    <span className="relative flex items-center justify-center gap-3">
                      {processing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Liberar Meu Plano Agora
                        </>
                      )}
                    </span>
                  </button>
                </div>

                {/* Microcopy de segurança - Mais específica */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-300 px-4">
                  <Lock className="w-3 h-3 flex-shrink-0" />
                  <span>Pagamento com criptografia SSL. Seus dados não são armazenados.</span>
                </div>

                {/* O que acontece depois do pagamento */}
                {paymentMethod === "card" && (
                  <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3 flex gap-2 text-xs text-lime-300">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Acesso liberado imediatamente após a confirmação</span>
                  </div>
                )}

                {paymentMethod === "pix" && (
                  <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3 flex gap-2 text-xs text-lime-300 items-center justify-center">
                    <Zap className="w-4 h-4 flex-shrink-0" />
                    <span>Liberação automática em poucos segundos</span>
                  </div>
                )}

                {paymentMethod === "boleto" && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex gap-2 text-xs text-blue-300">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Liberação assim que o pagamento for confirmado</span>
                  </div>
                )}

                {/* Texto auxiliar */}
                <p className="text-xs text-gray-400 text-center">
                  Renovação automática. Cancele a qualquer momento.
                </p>

              </div>

              {/* Payment Methods and Security Seals */}
              <div className="space-y-4 border-t border-slate-700 pt-6">
                {/* Payment Methods - Real Image */}
                <div>
                  <p className="text-xs text-gray-400 mb-3 font-semibold">Formas de Pagamento Aceitas</p>
                  <div className="flex justify-center">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image%20%281%29-jw1JPyvxkfSr48fVwN5Fqg6Is6wcn8.webp"
                      alt="Formas de Pagamento"
                      className="h-20 w-auto"
                    />
                  </div>
                </div>

                {/* Security Seals - Real Image */}
                <div>
                  <p className="text-xs text-gray-400 mb-3 font-semibold">Segurança Garantida</p>
                  <div className="flex justify-center">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%209%20de%20fev.%20de%202026%2C%2007_33_32-1iWUwKOD8rqFexNiRWJyPAV93cR1ox.webp"
                      alt="Selos de Segurança"
                      className="h-20 w-auto"
                    />
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  Precisa de ajuda?{" "}
                  <a href="mailto:suportet@fitgoal.com.br" className="text-lime-400 hover:text-lime-300 font-semibold">
                    suporte@fitgoal.com.br
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
