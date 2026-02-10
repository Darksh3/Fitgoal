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
import { doc, onSnapshot, setDoc, db, auth, getDoc } from "@/lib/firebaseClient"
import { onAuthStateChanged } from "firebase/auth"
import Link from "next/link"
import Image from "next/image"

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

  const [user, setUser] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(90)
  const [selectedPlan, setSelectedPlan] = useState<"mensal" | "trimestral" | "semestral">("semestral")
  const [prefillLoading, setPrefillLoading] = useState(false)

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

  useEffect(() => {
    const initialPlan = searchParams.get("planKey") as "mensal" | "trimestral" | "semestral" | null
    if (initialPlan) {
      setSelectedPlan(initialPlan)
    }
    // Set Pix as default payment method for better UX on mobile Brazil
    setPaymentMethod("pix")
  }, [searchParams])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Real-time payment listener
  useEffect(() => {
    // For PIX and Card - listen to specific payment ID
    const currentPaymentId = pixData?.paymentId || cardPaymentId
    const method = pixData?.paymentId ? "pix" : cardPaymentId ? "card" : null

    if (!currentPaymentId || !method) return

    console.log("[v0] PAYMENT_LISTENER_SETUP - Configurando listener para:", { currentPaymentId, method })

    const paymentRef = doc(db, "payments", currentPaymentId)
    const unsubscribe = onSnapshot(paymentRef, (snapshot) => {
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
        unsubscribe()
      }
    })

    return () => unsubscribe()
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
    if (!user) return
    setPrefillLoading(true)

    try {
      const ref = doc(db, "users", user.uid)
      const snap = await getDoc(ref)

      if (snap.exists()) {
        const data = snap.data() as any

        setFormData((prev) => ({
          ...prev,
          email: prev.email || data.email || "",
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
      console.log("[v0] Erro de validação:", validationError)
      setError(validationError)
      return
    }

    console.log("[v0] Iniciando pagamento com método:", paymentMethod)
    console.log("[v0] Dados do formulário:", { name: formData.name, email: formData.email })
    console.log("[v0] Plano:", { selectedPlan, planName, planPrice })

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
      const paymentPayload: Record<string, any> = {
        email: formData.email,
        name: formData.name,
        cpf: formData.cpf.replace(/\D/g, ""),
        phone: formData.phone.replace(/\D/g, ""),
        planType: selectedPlan,
        paymentMethod: paymentMethod === "card" ? "card" : paymentMethod,
        description: `${planName} - Fitgoal Fitness`,
        clientUid: user?.uid,
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

        try {
          await setDoc(doc(db, "payments", paymentResult.paymentId), {
            paymentId: paymentResult.paymentId,
            userId: user?.uid || "anonymous",
            status: "PENDING",
            billingType: "PIX",
            createdAt: new Date(),
          })
          console.log("[v0] PIX salvo no Firestore com userID:", user?.uid || "anonymous")
        } catch (err) {
          console.error("[v0] Erro ao salvar PIX:", err)
        }

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

        try {
          await setDoc(doc(db, "payments", paymentResult.paymentId), {
            paymentId: paymentResult.paymentId,
            userId: user?.uid || "anonymous",
            status: "PENDING",
            billingType: "CARD",
            createdAt: new Date(),
          })
          console.log("[v0] Cartão salvo no Firestore com paymentId:", paymentResult.paymentId)
          setCardPaymentId(paymentResult.paymentId)
        } catch (err) {
          console.error("[v0] Erro ao salvar cartão:", err)
        }

        setProcessing(false)
        return
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao processar pagamento"
      console.log("[v0] Erro capturado:", errorMsg)
      setError(errorMsg)
    } finally {
      setProcessing(false)
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center max-w-md w-full">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, delay: 0.3 }}>
            <CheckCircle2 className="w-20 h-20 text-lime-500 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Pagamento Confirmado!</h2>
          <p className="text-gray-400 mb-6">Bem-vindo ao FitGoal. Seu acesso foi liberado.</p>

          <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 mb-6 space-y-2">
            <p className="text-sm text-gray-300">
              <span className="text-lime-400 font-semibold">Status:</span> Pagamento Processado
            </p>
            <p className="text-sm text-gray-300">
              <span className="text-lime-400 font-semibold">Plano:</span> {planName}
            </p>
            <p className="text-sm text-gray-300">
              <span className="text-lime-400 font-semibold">Valor:</span> R$ {parseFloat(planPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <p className="text-gray-400 mb-6 text-sm">Redirecionando em {redirectCountdown}s...</p>
          <div className="w-full bg-slate-700 rounded-full h-1 overflow-hidden">
            <motion.div
              className="h-full bg-lime-500"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 90, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Order Summary */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-white mb-4">Resumo do Pedido</h3>

                {/* Plan Selector */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <button
                    onClick={() => setSelectedPlan("mensal")}
                    className={`p-2 rounded-lg border-2 transition-all text-center ${selectedPlan === "mensal"
                      ? "border-lime-500 bg-lime-500/10"
                      : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                      }`}
                  >
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
                      -25%
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
                      -40%
                    </div>
                    <div className={`text-xs font-semibold ${selectedPlan === "semestral" ? "text-lime-400" : "text-gray-300"}`}>Semestral</div>
                    <div className={`text-sm font-bold ${selectedPlan === "semestral" ? "text-lime-400" : "text-gray-400"}`}>R$ 239,90</div>
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-gray-200">
                    <Check className="w-4 h-4 text-lime-500" />
                    <span className="font-semibold">{planName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-lime-500" />
                    <span>{selectedPlan === "mensal" ? "1 mês" : selectedPlan === "trimestral" ? "3 meses" : "6 meses"} de treino e dieta personalizada</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-lime-500" />
                    <span>Acesso Completo ao App + Acompanhamento Contínuo</span>
                  </div>
                </div>

                <div className="border-t border-slate-600 pt-4 flex justify-between items-center">
                  <span className="text-gray-300">Total</span>
                  <span className="text-3xl font-bold text-lime-500">R$ {parseFloat(planPrice).toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {selectedPlan === "mensal" && "R$ 79,90 por mês"}
                  {selectedPlan === "trimestral" && "R$ 59,97 por mês"}
                  {selectedPlan === "semestral" && "Menos de R$40 por mês!"}
                </div>
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
                        if (value.length <= 11) {
                          if (value.length > 8) {
                            value = value.slice(0, 3) + "." + value.slice(3, 6) + "." + value.slice(6, 9) + "-" + value.slice(9)
                          } else if (value.length > 5) {
                            value = value.slice(0, 3) + "." + value.slice(3, 6) + "." + value.slice(6)
                          } else if (value.length > 2) {
                            value = value.slice(0, 3) + "." + value.slice(3)
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
                        if (value.length <= 11) {
                          if (value.length > 6) {
                            value = "(" + value.slice(0, 2) + ") " + value.slice(2, 7) + "-" + value.slice(7)
                          } else if (value.length > 2) {
                            value = "(" + value.slice(0, 2) + ") " + value.slice(2)
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
                      onChange={(e) => handleAddressChange(e, "postalCode")}
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
                    {selectedPlan === "semestral" && [1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n} className="bg-slate-800">
                        {n}x de R$ {(parseFloat(planPrice) / n).toFixed(2).replace(".", ",")}</option>
                    ))}
                    {selectedPlan === "trimestral" && [1, 2, 3].map((n) => (
                      <option key={n} value={n} className="bg-slate-800">
                        {n}x de R$ {(parseFloat(planPrice) / n).toFixed(2).replace(".", ",")}</option>
                    ))}
                    {selectedPlan === "mensal" && (
                      <option value={1} className="bg-slate-800">
                        1x de R$ {parseFloat(planPrice).toFixed(2).replace(".", ",")}</option>
                    )}
                  </select>

                  {/* Sugestão de parcelamento condicional */}
                  {selectedPlan === "semestral" && (
                    <div className="text-xs text-lime-400 text-center">
                      ou até 6x de R$ {(parseFloat(planPrice) / 6).toFixed(2).replace(".", ",")}
                    </div>
                  )}
                  {selectedPlan === "trimestral" && (
                    <div className="text-xs text-lime-400 text-center">
                      ou até 3x de R$ {(parseFloat(planPrice) / 3).toFixed(2).replace(".", ",")}
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

              {/* Secure Payment Container - Menos densidade */}
              <div className="bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 md:p-8 space-y-5">

                {/* SUBCONTAINER — botão mais dominante */}
                <div className="w-full max-w-md mx-auto bg-slate-900/50 border border-slate-600/80 rounded-xl p-5 flex justify-center shadow-lg">
                  {/* PIX Payment Display - Inline above button */}
                {paymentMethod === "pix" && pixData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-gradient-to-b from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 space-y-4"
                  >
                    <div className="text-center mb-4">
                      <QrCode className="w-10 h-10 text-lime-500 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-white">Código QR Pix Gerado</h3>
                      <p className="text-sm text-gray-400 mt-1">Escaneie com seu smartphone ou copie o código</p>
                    </div>

                    {pixData.qrCode && (
                      <div className="bg-white p-4 rounded-lg flex items-center justify-center mx-auto w-fit">
                        <img 
                          src={`data:image/png;base64,${pixData.qrCode}`}
                          alt="QR Code Pix" 
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                    )}

                    <div className="bg-slate-700/30 p-4 rounded-lg">
                      <p className="text-xs text-gray-400 mb-2">Código Pix (copia e cola):</p>
                      <code className="text-white font-mono text-xs break-all block max-h-24 overflow-y-auto bg-slate-800/50 p-2 rounded">{pixData.copyPaste}</code>
                    </div>

                    <Button
                      onClick={() => navigator.clipboard.writeText(pixData.copyPaste)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
                    >
                      Copiar Código Pix
                    </Button>
                  </motion.div>
                )}

                <Button
                    onClick={handlePayment}
                    disabled={!paymentMethod || processing}
                    className="w-full bg-lime-500 hover:bg-lime-600 hover:shadow-[0_0_20px_rgba(132,204,22,0.5)] disabled:bg-gray-500 disabled:cursor-not-allowed text-black font-bold py-7 text-base rounded-lg shadow-lg transition-all uppercase tracking-wide"
                  >
                    <span className="flex items-center justify-center w-full gap-2">
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Confirmar Pagamento
                        </>
                      )}
                    </span>
                  </Button>
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
