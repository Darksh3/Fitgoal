"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CreditCard,
  Check,
  Lock,
  QrCode,
  FileText,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
} from "lucide-react"
import { motion } from "framer-motion"
import { doc, onSnapshot, setDoc, db, auth } from "@/lib/firebaseClient"
import { onAuthStateChanged } from "firebase/auth"
import Link from "next/link"
import Image from "next/image"

type PaymentMethod = "pix" | "boleto" | "card" | "apple" | "google"

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

  // Plan info from query params or selected plan
  const planKey = searchParams.get("planKey") || selectedPlan
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
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!success) return

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          window.location.href = "/dashboard"
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [success])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof PaymentFormData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof CardData) => {
    let value = e.target.value

    if (field === "number") {
      value = value.replace(/\s/g, "").replace(/(\d{4})/g, "$1 ").trim()
    }
    if (field === "ccv") {
      value = value.replace(/\D/g, "").slice(0, 4)
    }
    if (field === "expiryMonth") {
      value = value.replace(/\D/g, "").slice(0, 2)
    }
    if (field === "expiryYear") {
      value = value.replace(/\D/g, "").slice(0, 4)
    }

    setCardData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof AddressData) => {
    let value = e.target.value

    if (field === "postalCode") {
      value = value.replace(/\D/g, "").slice(0, 8)
      if (value.length === 5) {
        value = value.slice(0, 5) + "-" + value.slice(5)
      }
    }

    setAddressData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateFormData = (): boolean => {
    const missingFields = []

    if (!formData.email?.trim()) missingFields.push("Email")
    if (!formData.name?.trim()) missingFields.push("Nome Completo")
    if (!formData.cpf?.trim()) missingFields.push("CPF")
    if (!formData.phone?.trim()) missingFields.push("Telefone")

    if (paymentMethod === "card") {
      const cardMissingFields = []
      if (!cardData.holderName?.trim()) cardMissingFields.push("Nome no Cartão")
      if (!cardData.number?.replace(/\s/g, "")) cardMissingFields.push("Número do Cartão")
      if (!cardData.expiryMonth) cardMissingFields.push("Mês")
      if (!cardData.expiryYear) cardMissingFields.push("Ano")
      if (!cardData.ccv) cardMissingFields.push("CVV")
      if (!addressData.postalCode?.replace(/\D/g, "")) cardMissingFields.push("CEP")
      if (!addressData.addressNumber?.trim()) cardMissingFields.push("Número")

      if (cardMissingFields.length > 0) {
        setError(`Campos faltando: ${cardMissingFields.join(", ")}`)
        return false
      }
    }

    if (missingFields.length > 0) {
      setError(`Campos obrigatórios: ${missingFields.join(", ")}`)
      return false
    }

    return true
  }

  const handlePayment = async () => {
    if (processing || !paymentMethod) return
    if (!validateFormData()) return

    try {
      setProcessing(true)
      setError(null)

      const paymentPayload: Record<string, any> = {
        email: formData.email,
        name: formData.name,
        cpf: formData.cpf.replace(/\D/g, ""),
        phone: formData.phone.replace(/\D/g, ""),
        planType: planKey,
        description: `${planName} - Fitgoal Fitness`,
        clientUid: user?.uid || "",
        amount: parseFloat(planPrice),
      }

      if (paymentMethod === "apple" || paymentMethod === "google") {
        paymentPayload.paymentMethod = "card"
        paymentPayload.billingType = "CREDIT_CARD"
      } else {
        paymentPayload.paymentMethod = paymentMethod
      }

      if (paymentMethod === "card") {
        paymentPayload.installments = installments || 1
      }

      if ((paymentMethod === "boleto" || paymentMethod === "card") && addressData.postalCode) {
        paymentPayload.postalCode = addressData.postalCode.replace(/\D/g, "")
        paymentPayload.addressNumber = addressData.addressNumber
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

      const paymentResponse = await fetch("/api/create-asaas-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        throw new Error(errorData.error || "Erro ao criar cobrança")
      }

      const paymentResult = await paymentResponse.json()

      if (paymentMethod === "pix") {
        localStorage.setItem("lastPaymentId", paymentResult.paymentId)

        try {
          await setDoc(doc(db, "payments", paymentResult.paymentId), {
            paymentId: paymentResult.paymentId,
            userId: user?.uid || "",
            status: "PENDING",
            billingType: "PIX",
            createdAt: new Date(),
          })
        } catch (error) {
          console.error("Erro ao salvar PIX no Firestore:", error)
        }

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

      if (paymentMethod === "card" || paymentMethod === "apple" || paymentMethod === "google") {
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

        const cardResponse = await fetch("/api/process-asaas-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cardPayload),
        })

        if (!cardResponse.ok) {
          const errorData = await cardResponse.json()
          throw new Error(errorData.error || "Erro ao processar cartão")
        }

        try {
          await setDoc(doc(db, "payments", paymentResult.paymentId), {
            paymentId: paymentResult.paymentId,
            userId: user?.uid || "",
            status: "PENDING",
            billingType: "CARD",
            createdAt: new Date(),
          })
        } catch (error) {
          console.error("Erro ao salvar cartão no Firestore:", error)
        }

        setSuccess(true)
        setProcessing(false)
        return
      }
    } catch (err: any) {
      console.error("Erro no pagamento:", err)
      setError(err.message || "Ocorreu um erro durante o pagamento")
      setProcessing(false)
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-600">
            <CardContent className="pt-12 pb-12 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="flex justify-center"
              >
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Pagamento Confirmado!</h2>
                <p className="text-green-100">Sua inscrição foi ativada com sucesso.</p>
              </div>

              <div className="text-sm text-green-100">
                Redirecionando para o dashboard em {redirectCountdown} segundos...
              </div>

              <Button asChild className="w-full bg-white text-green-900 hover:bg-gray-100">
                <Link href="/dashboard">Ir para o Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // PIX screen
  if (pixData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full space-y-6"
        >
          <Button
            variant="ghost"
            onClick={() => {
              setPixData(null)
              setPaymentMethod(null)
            }}
            className="text-gray-400 hover:text-white"
          >
            ← Voltar
          </Button>

          <Card className="bg-white border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-lime-500" />
                Pagar com Pix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-center">
                {pixData.qrCode ? (
                  <img src={pixData.qrCode} alt="QR Code Pix" className="max-w-xs" />
                ) : (
                  <div className="text-center text-gray-500">QR Code não disponível</div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">Ou copie o código Pix:</p>
                <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between gap-2">
                  <code className="text-xs text-gray-700 break-all">{pixData.copyPaste}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.copyPaste)
                    }}
                    className="text-lime-500 hover:text-lime-600 text-sm whitespace-nowrap font-semibold"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center">Aguardando confirmação do pagamento...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Boleto screen
  if (boletoData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full space-y-6"
        >
          <Button
            variant="ghost"
            onClick={() => {
              setBoletoData(null)
              setPaymentMethod(null)
            }}
            className="text-gray-400 hover:text-white"
          >
            ← Voltar
          </Button>

          <Card className="bg-white border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-lime-500" />
                Pagar com Boleto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Código de barras:</p>
                <code className="text-gray-900 font-mono text-sm break-all">{boletoData.barCode}</code>
              </div>

              <Button asChild className="w-full bg-lime-500 text-black hover:bg-lime-600">
                <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                  Acessar Boleto
                </a>
              </Button>

              <p className="text-xs text-gray-600 text-center">Você será redirecionado para visualizar e pagar o boleto</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Main checkout screen - Centered Card Design
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center mb-4">
          <Image src="/fitgoal-logo.webp" alt="FitGoal Logo" width={200} height={80} className="mx-auto" priority />
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Finalizar sua inscrição</h1>
        </motion.div>

        {/* Main Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="bg-slate-800/40 backdrop-blur border-slate-700/50 shadow-2xl">
            <CardContent className="p-8 space-y-6">
              {/* Order Summary */}
              <div className="bg-slate-700/30 p-6 rounded-lg border border-slate-600/50">
                <h3 className="font-semibold text-white mb-4">Resumo do Pedido</h3>

                {/* Plan Selector */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <button
                    onClick={() => setSelectedPlan("mensal")}
                    className={`p-2 rounded-lg border-2 transition-all text-center ${
                      selectedPlan === "mensal"
                        ? "border-lime-500 bg-lime-500/10"
                        : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${selectedPlan === "mensal" ? "text-lime-400" : "text-gray-300"}`}>
                      Mensal
                    </div>
                    <div className={`text-sm font-bold ${selectedPlan === "mensal" ? "text-lime-400" : "text-gray-400"}`}>
                      R$ 79,90
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPlan("trimestral")}
                    className={`p-2 rounded-lg border-2 transition-all text-center relative ${
                      selectedPlan === "trimestral"
                        ? "border-lime-500 bg-lime-500/10"
                        : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                  >
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-lime-500 px-2 py-0.5 rounded text-xs font-bold text-black">
                      -25%
                    </div>
                    <div className={`text-xs font-semibold ${selectedPlan === "trimestral" ? "text-lime-400" : "text-gray-300"}`}>
                      Trimestral
                    </div>
                    <div className={`text-sm font-bold ${selectedPlan === "trimestral" ? "text-lime-400" : "text-gray-400"}`}>
                      R$ 179,90
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedPlan("semestral")}
                    className={`p-2 rounded-lg border-2 transition-all text-center relative ${
                      selectedPlan === "semestral"
                        ? "border-lime-500 bg-lime-500/10"
                        : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                  >
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-lime-500 px-2 py-0.5 rounded text-xs font-bold text-black">
                      -40%
                    </div>
                    <div className={`text-xs font-semibold ${selectedPlan === "semestral" ? "text-lime-400" : "text-gray-300"}`}>
                      Semestral
                    </div>
                    <div className={`text-sm font-bold ${selectedPlan === "semestral" ? "text-lime-400" : "text-gray-400"}`}>
                      R$ 239,90
                    </div>
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

              <div className="border-t border-slate-600 pt-6">
                {/* Payment Methods */}
                <h3 className="font-semibold text-white mb-4">Escolha a forma de pagamento</h3>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => {
                      setPaymentMethod("pix")
                      setError(null)
                    }}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === "pix" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                  >
                    <QrCode className={`w-5 h-5 ${paymentMethod === "pix" ? "text-lime-400" : "text-gray-400"}`} />
                    <span className={`text-sm font-semibold ${paymentMethod === "pix" ? "text-lime-400" : "text-gray-300"}`}>Pagar com Pix</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod("boleto")
                      setError(null)
                    }}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === "boleto" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                  >
                    <FileText className={`w-5 h-5 ${paymentMethod === "boleto" ? "text-lime-400" : "text-gray-400"}`} />
                    <span className={`text-sm font-semibold ${paymentMethod === "boleto" ? "text-lime-400" : "text-gray-300"}`}>Boleto</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod("apple")
                      setError(null)
                    }}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === "apple" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                  >
                    <div className="text-lg font-bold">🍎</div>
                    <span className={`text-sm font-semibold ${paymentMethod === "apple" ? "text-lime-400" : "text-gray-300"}`}>Apple Pay</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod("google")
                      setError(null)
                    }}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === "google" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                    }`}
                  >
                    <div className="text-lg font-bold">G</div>
                    <span className={`text-sm font-semibold ${paymentMethod === "google" ? "text-lime-400" : "text-gray-300"}`}>Google Pay</span>
                  </button>
                </div>

                {/* Or card payment */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 border-t border-slate-600"></div>
                  <span className="text-sm text-gray-400">Ou pague com cartão</span>
                  <div className="flex-1 border-t border-slate-600"></div>
                </div>

                <button
                  onClick={() => {
                    setPaymentMethod("card")
                    setError(null)
                  }}
                  className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-3 mb-6 ${
                    paymentMethod === "card" ? "border-lime-500 bg-lime-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-700/20"
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === "card" ? "text-lime-400" : "text-gray-400"}`} />
                  <span className={`font-semibold ${paymentMethod === "card" ? "text-lime-400" : "text-gray-300"}`}>Cartão de Crédito</span>
                </button>

                {/* Personal Info Fields - Always visible */}
                <div className="space-y-3 mb-6">
                  <Input
                    placeholder="Nome Completo"
                    value={formData.name}
                    onChange={(e) => handleInputChange(e, "name")}
                    className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange(e, "email")}
                    className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
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
                      className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
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
                      className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {/* Card Fields - Show only if card is selected */}
                {paymentMethod === "card" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3 mb-6">
                    <Input
                      placeholder="Número do Cartão"
                      value={cardData.number}
                      onChange={(e) => handleCardChange(e, "number")}
                      maxLength={19}
                      className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500 font-mono"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Validade (MM)"
                        value={cardData.expiryMonth}
                        onChange={(e) => handleCardChange(e, "expiryMonth")}
                        maxLength={2}
                        className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                      />
                      <Input
                        placeholder="Ano (YYYY)"
                        value={cardData.expiryYear}
                        onChange={(e) => handleCardChange(e, "expiryYear")}
                        maxLength={4}
                        className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                      />
                      <Input
                        placeholder="CVV"
                        value={cardData.ccv}
                        onChange={(e) => handleCardChange(e, "ccv")}
                        maxLength={4}
                        className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <Input
                      placeholder="Nome no Cartão"
                      value={cardData.holderName}
                      onChange={(e) => handleCardChange(e, "holderName")}
                      className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="CEP"
                        value={addressData.postalCode}
                        onChange={(e) => handleAddressChange(e, "postalCode")}
                        className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                      />
                      <Input
                        placeholder="Número da Residência"
                        value={addressData.addressNumber}
                        onChange={(e) => handleAddressChange(e, "addressNumber")}
                        className="bg-slate-700/40 border-slate-600 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(parseInt(e.target.value))}
                      className="w-full bg-slate-700/40 border border-slate-600 text-white rounded-md px-3 py-2"
                    >
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}x de R$ {(parseFloat(planPrice) / num).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="mb-4">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  </motion.div>
                )}

                {/* Security Badge */}
                <div className="bg-slate-700/40 p-3 rounded-lg flex items-center justify-center gap-2 text-sm text-gray-300 mb-6 border border-slate-600/50">
                  <Lock className="w-4 h-4" />
                  Compra Segura Seus dados estão protegidos
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handlePayment}
                  disabled={!paymentMethod || processing}
                  className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold py-6 text-lg mb-4"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Confirmar Pagamento
                    </>
                  )}
                </Button>

                {/* Additional Info */}
                <p className="text-xs text-gray-400 text-center mb-4">Renovação automática. Cancele a qualquer momento.</p>

                {/* Support */}
                <div className="text-center">
                  <p className="text-xs text-gray-400">
                    Precisa de ajuda?{" "}
                    <a href="mailto:support@fitgoal.com.br" className="text-lime-400 hover:text-lime-300 font-semibold">
                      support@fitgoal.com.br
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Security Badges */}
        <div className="flex items-center justify-center gap-8 text-center">
          <div className="flex flex-col items-center gap-1">
            <Shield className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400">SITE SEGURO</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Lock className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-400">SSL</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              <div className="w-4 h-3 bg-red-600 rounded"></div>
              <div className="w-4 h-3 bg-orange-500 rounded"></div>
            </div>
            <span className="text-xs text-gray-400">MASTERCARD</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              <div className="w-4 h-3 bg-blue-600 rounded"></div>
              <div className="w-4 h-3 bg-gray-400 rounded"></div>
            </div>
            <span className="text-xs text-gray-400">VISA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
