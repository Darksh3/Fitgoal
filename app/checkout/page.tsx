"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { motion } from "framer-motion"
import { doc, onSnapshot, setDoc, db } from "@/lib/firebaseClient"
import { auth, onAuthStateChanged } from "firebase/auth"
import Link from "next/link"

type PaymentMethod = "pix" | "boleto" | "card"

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

  // Form data
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

  // Get plan info from query params
  const planName = searchParams.get("planName") || "Plano Semestral"
  const planPrice = searchParams.get("planPrice") || "239.90"
  const planKey = searchParams.get("planKey") || "semestral"

  // Auth setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Real-time payment listener
  useEffect(() => {
    const paymentId = pixData?.paymentId || cardPaymentId
    const method = pixData?.paymentId ? "pix" : cardPaymentId ? "card" : null

    if (!paymentId || !method) return

    console.log("[v0] PAYMENT_LISTENER_SETUP - Configurando listener para:", { paymentId, method })

    try {
      const paymentDocRef = doc(db, "payments", paymentId)
      const unsubscribe = onSnapshot(
        paymentDocRef,
        (snapshot) => {
          if (!snapshot.exists()) return

          const paymentData = snapshot.data()
          console.log("[v0] PAYMENT_LISTENER - Status:", paymentData?.status)

          if (paymentData?.status === "RECEIVED" || paymentData?.status === "CONFIRMED") {
            console.log("[v0] PAYMENT_CONFIRMED")
            setSuccess(true)
            unsubscribe()
          }
        },
        (error) => {
          console.error("[v0] PAYMENT_LISTENER_ERROR:", error)
        }
      )

      return () => unsubscribe()
    } catch (error) {
      console.error("[v0] PAYMENT_LISTENER_SETUP_ERROR:", error)
    }
  }, [pixData?.paymentId, cardPaymentId])

  // Redirect countdown
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
      if (!cardData.expiryMonth) cardMissingFields.push("Mês de Validade")
      if (!cardData.expiryYear) cardMissingFields.push("Ano de Validade")
      if (!cardData.ccv) cardMissingFields.push("CVV")
      if (!addressData.postalCode?.replace(/\D/g, "")) cardMissingFields.push("CEP")
      if (!addressData.addressNumber?.trim()) cardMissingFields.push("Número do Endereço")

      if (cardMissingFields.length > 0) {
        setError(`Campos do cartão faltando: ${cardMissingFields.join(", ")}`)
        return false
      }
    }

    if (missingFields.length > 0) {
      setError(`Campos obrigatórios faltando: ${missingFields.join(", ")}`)
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
        paymentMethod: paymentMethod,
        description: `${planName} - Fitgoal Fitness`,
        clientUid: user?.uid || "",
        amount: parseFloat(planPrice),
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

        setCardPaymentId(paymentResult.paymentId)
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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Pagar com Pix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                {pixData.qrCode ? (
                  <img src={pixData.qrCode} alt="QR Code Pix" className="max-w-xs" />
                ) : (
                  <div className="text-center text-gray-500">QR Code não disponível</div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-400">Ou copie o código Pix:</p>
                <div className="bg-slate-700 p-4 rounded-lg flex items-center justify-between gap-2">
                  <code className="text-xs text-gray-200 break-all">{pixData.copyPaste}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.copyPaste)
                    }}
                    className="text-lime-400 hover:text-lime-300 text-sm whitespace-nowrap"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-400 text-center">Aguardando confirmação do pagamento...</p>
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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pagar com Boleto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-700 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Código de barras:</p>
                <code className="text-white font-mono text-sm break-all">{boletoData.barCode}</code>
              </div>

              <Button asChild className="w-full bg-lime-500 text-black hover:bg-lime-600">
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

  // Main checkout screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Finalizar sua Inscrição</h1>
            <p className="text-gray-400">Complete o pagamento para ativar seu acesso</p>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Payment Form */}
          <div className="md:col-span-2 space-y-6">
            {/* Payment Method Selection */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { id: "pix" as PaymentMethod, name: "Pix", icon: Smartphone, desc: "Pagamento instantâneo" },
                  { id: "boleto" as PaymentMethod, name: "Boleto", icon: FileText, desc: "Vencimento em 3 dias" },
                  { id: "card" as PaymentMethod, name: "Cartão de Crédito", icon: CreditCard, desc: "Parcelamento disponível" },
                ].map((method) => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                        paymentMethod === method.id
                          ? "border-lime-500 bg-lime-500/10"
                          : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${paymentMethod === method.id ? "text-lime-500" : "text-gray-400"}`} />
                      <div className="flex-1 text-left">
                        <div className={`font-semibold ${paymentMethod === method.id ? "text-lime-500" : "text-white"}`}>
                          {method.name}
                        </div>
                        <div className="text-sm text-gray-400">{method.desc}</div>
                      </div>
                      {paymentMethod === method.id && <Check className="w-5 h-5 text-lime-500" />}
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-200">Nome Completo *</label>
                  <Input
                    placeholder="João da Silva"
                    value={formData.name}
                    onChange={(e) => handleInputChange(e, "name")}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-200">Email *</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange(e, "email")}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-200">CPF *</label>
                    <Input
                      placeholder="000.000.000-00"
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
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-200">Telefone *</label>
                    <Input
                      placeholder="(11) 99999-9999"
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
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Information - Show only if card is selected */}
            {paymentMethod === "card" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Informações do Cartão
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-200">Nome no Cartão *</label>
                      <Input
                        placeholder="JOÃO DA SILVA"
                        value={cardData.holderName}
                        onChange={(e) => handleCardChange(e, "holderName")}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-200">Número do Cartão *</label>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        value={cardData.number}
                        onChange={(e) => handleCardChange(e, "number")}
                        maxLength={19}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-200">Mês *</label>
                        <Input
                          placeholder="MM"
                          value={cardData.expiryMonth}
                          onChange={(e) => handleCardChange(e, "expiryMonth")}
                          maxLength={2}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-200">Ano *</label>
                        <Input
                          placeholder="YYYY"
                          value={cardData.expiryYear}
                          onChange={(e) => handleCardChange(e, "expiryYear")}
                          maxLength={4}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-200">CVV *</label>
                        <Input
                          placeholder="123"
                          value={cardData.ccv}
                          onChange={(e) => handleCardChange(e, "ccv")}
                          maxLength={4}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-200">CEP *</label>
                        <Input
                          placeholder="12345-678"
                          value={addressData.postalCode}
                          onChange={(e) => handleAddressChange(e, "postalCode")}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-200">Número da Residência *</label>
                        <Input
                          placeholder="123"
                          value={addressData.addressNumber}
                          onChange={(e) => handleAddressChange(e, "addressNumber")}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                        />
                      </div>
                    </div>

                    {/* Installments */}
                    <div>
                      <label className="text-sm font-medium text-gray-200">Parcelamento</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(parseInt(e.target.value))}
                        className="w-full mt-2 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2"
                      >
                        {Array.from({ length: 6 }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            {num}x de R$ {(parseFloat(planPrice) / num).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Address Information for Boleto */}
            {paymentMethod === "boleto" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Endereço</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-200">CEP *</label>
                        <Input
                          placeholder="12345-678"
                          value={addressData.postalCode}
                          onChange={(e) => handleAddressChange(e, "postalCode")}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-200">Número da Residência *</label>
                        <Input
                          placeholder="123"
                          value={addressData.addressNumber}
                          onChange={(e) => handleAddressChange(e, "addressNumber")}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-gray-500 mt-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="md:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="sticky top-8"
            >
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Resumo do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Plan Info */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-lime-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-white">{planName}</p>
                        <p className="text-xs text-gray-400">6 meses de treino e dieta personalizados</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-lime-500 mt-1 flex-shrink-0" />
                      <p className="text-sm text-gray-300">Acesso Completo ao App + Acompanhamento Contínuo</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-700" />

                  {/* Pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-white font-semibold">R$ {parseFloat(planPrice).toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-700" />

                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-2xl font-bold text-lime-500">R$ {parseFloat(planPrice).toFixed(2).replace(".", ",")}</span>
                  </div>

                  {/* Guarantee */}
                  <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-3 flex gap-2">
                    <CheckCircle2 className="w-5 h-5 text-lime-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-lime-400 text-sm">Garantia 30 Dias</p>
                      <p className="text-xs text-lime-300">Satisfação 100% ou seu dinheiro de volta</p>
                    </div>
                  </div>

                  {/* Security Badge */}
                  <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-center gap-2 text-xs text-gray-300">
                    <Lock className="w-4 h-4" />
                    Transação 100% Segura
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handlePayment}
                    disabled={!paymentMethod || processing}
                    className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold py-6 text-lg"
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
                  <p className="text-xs text-gray-400 text-center">Renovação automática. Cancele a qualquer momento.</p>

                  {/* Support */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400">
                      Precisa de ajuda?{" "}
                      <a href="mailto:support@fitgoal.com.br" className="text-lime-500 hover:text-lime-400">
                        support@fitgoal.com.br
                      </a>
                    </p>
                  </div>

                  {/* Payment Badges */}
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-700">
                    <div className="text-xs text-gray-400 text-center">
                      <p className="mb-1">Formas de Pagamento</p>
                      <div className="flex justify-center gap-1">
                        {["VISA", "MC", "ELO", "HIPERCARD"].map((card) => (
                          <div key={card} className="w-8 h-5 bg-slate-600 rounded text-xs flex items-center justify-center text-white font-bold">
                            {card[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
  const [processing, setProcessing] = useState(false)
  const [installments, setInstallments] = useState(1)
  const [cardData, setCardData] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  })
  const [addressData, setAddressData] = useState({
    postalCode: "",
    addressNumber: "",
  })
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null)
  const [boletoData, setBoletoData] = useState<{ url: string; barCode: string } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null) // Declare paymentStatus here

  const maxInstallments = 6
  const minInstallmentValue = 50
  const isSemestral = currentPlan?.name === "Plano Semestral"

  const calculateMaxInstallments = () => {
    if (isSemestral) return maxInstallments
    return Math.min(maxInstallments, Math.floor(currentPlan.total / minInstallmentValue))
  }

  const availableInstallments = paymentMethod === "card" ? calculateMaxInstallments() : 1
  const installmentOptions = Array.from({ length: availableInstallments }, (_, i) => i + 1)

  const handleAsaasPayment = async () => {
    try {
      setProcessing(true)
      const setError = onError

      console.log("[v0] Dados sendo enviados para Asaas:", {
        email: userEmail,
        name: formData.name,
        cpf: formData.cpf,
        phone: formData.phone,
        planType: currentPlan.key,
        paymentMethod,
        installments: paymentMethod === "card" ? installments : undefined,
        clientUid,
      })

      // 1. Salvar dados no Firebase com UID
      if (clientUid) {
        try {
          const userDocRef = doc(db, "users", clientUid)
          await setDoc(userDocRef, {
            email: userEmail,
            name: formData.name,
            cpf: formData.cpf,
            phone: formData.phone,
            planType: currentPlan.key,
            paymentMethod,
            checkoutDate: new Date().toISOString(),
            uid: clientUid,
          }, { merge: true })
          console.log("[v0] Dados salvos no Firebase com UID:", clientUid)
        } catch (firebaseError) {
          console.error("[v0] Erro ao salvar no Firebase:", firebaseError)
        }
      }

      // 2. Criar cobrança no Asaas
      const paymentResponse = await fetch("/api/create-asaas-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: formData.name,
          cpf: formData.cpf,
          phone: formData.phone,
          planType: currentPlan.key,
          paymentMethod,
          installments: paymentMethod === "card" ? installments : undefined,
          clientUid,
        }),
      })

      console.log("[v0] Resposta do servidor - status:", paymentResponse.status)

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        console.log("[v0] Erro do servidor:", errorData)
        throw new Error(errorData.error || "Erro ao criar cobrança")
      }

      const paymentResult = await paymentResponse.json()
      console.log("[v0] Resultado do pagamento:", paymentResult)
      console.log("[v0] pixQrCode value:", paymentResult.pixQrCode)
      console.log("[v0] pixQrCode type:", typeof paymentResult.pixQrCode)
      console.log("[v0] pixQrCode length:", paymentResult.pixQrCode?.length)
      console.log("[v0] pixCopyPaste value:", paymentResult.pixCopyPaste)

      // Salvar paymentId no estado para onSnapshot
      if (!paymentId) {
        setPaymentId(paymentResult.paymentId)
        console.log("[v0] PaymentId salvo para onSnapshot:", paymentResult.paymentId)
      }

      // Salvar pagamento no Firestore com status PENDING
      try {
        console.log("[v0] CHECKOUT_SAVING_PAYMENT - Salvando pagamento no Firestore com status PENDING")
        await setDoc(doc(db, "payments", paymentResult.paymentId), {
          paymentId: paymentResult.paymentId,
          userId: clientUid,
          status: "PENDING",
          paymentMethod: paymentMethod,
          planType: currentPlan.key,
          createdAt: new Date(),
        })
        console.log("[v0] CHECKOUT_PAYMENT_SAVED - Pagamento salvo no Firestore com status PENDING")
      } catch (error) {
        console.error("[v0] CHECKOUT_SAVE_ERROR - Erro ao salvar pagamento no Firestore:", error)
      }

      // 2. Se for Pix, buscar QR Code
      if (paymentMethod === "pix") {
        console.log("[v0] Buscando QR code para paymentId:", paymentResult.paymentId)

        const qrCodeResponse = await fetch(`/api/get-pix-qrcode?paymentId=${paymentResult.paymentId}`)

        if (qrCodeResponse.ok) {
          const qrCodeResult = await qrCodeResponse.json()
          console.log("[v0] QR Code obtido:", qrCodeResult)
          console.log("[v0] encodedImage:", qrCodeResult.encodedImage)
          console.log("[v0] payload:", qrCodeResult.payload)

          setPixData({
            qrCode: qrCodeResult.encodedImage || qrCodeResult.qrCode,
            copyPaste: qrCodeResult.payload,
          })
        } else {
          const errorData = await qrCodeResponse.json()
          console.error("[v0] Erro ao buscar QR code:", errorData)
          setPixData({
            qrCode: paymentResult.pixQrCode,
            copyPaste: paymentResult.pixCopyPaste,
          })
        }

        setProcessing(false)
        return
      }

      // 3. Se for Boleto, mostrar link
      if (paymentMethod === "boleto") {
        setBoletoData({
          url: paymentResult.boletoUrl,
          barCode: paymentResult.boletoBarCode,
        })
        setProcessing(false)
        return
      }

      // 4. Se for cartão, processar pagamento
      if (paymentMethod === "card") {
        const cardResponse = await fetch("/api/process-asaas-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
              email: userEmail,
              cpfCnpj: formData.cpf.replace(/\D/g, ""),
              postalCode: addressData.postalCode.replace(/\D/g, ""),
              addressNumber: addressData.addressNumber,
              phone: formData.phone.replace(/\D/g, ""),
            },
          }),
        })

        if (!cardResponse.ok) {
          const errorData = await cardResponse.json()
          throw new Error(errorData.error || "Erro ao processar cartão")
        }

        onSuccess()
      }
    } catch (err: any) {
      console.error("Erro no pagamento:", err)
      onError(err.message || "Ocorreu um erro durante o pagamento")
    } finally {
      setProcessing(false)
    }
  }

  // Tela de Pix
  if (pixData) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <QrCode className="h-5 w-5" /> Pagamento via Pix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {paymentStatus === "RECEIVED" || paymentStatus === "CONFIRMED" ? (
              <div className="bg-green-900 border-2 border-green-500 p-6 rounded-lg mb-4 animate-pulse">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-green-400 font-bold text-lg">Pagamento Confirmado!</p>
                <p className="text-green-300 text-sm mt-2">Redirecionando para sua conta...</p>
              </div>
            ) : (
              <>
                <p className="text-gray-300 mb-4">Escaneie o QR Code ou copie o código abaixo:</p>
                {pixData.qrCode ? (
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code Pix" className="w-64 h-64" />
                  </div>
                ) : (
                  <div className="bg-gray-700 p-4 rounded-lg inline-block mb-4 text-red-400">
                    <p>Erro ao gerar QR Code. Por favor, tente novamente.</p>
                  </div>
                )}
                <div className="bg-gray-700 p-3 rounded-lg mb-4">
                  <p className="text-xs text-gray-300 break-all font-mono">{pixData.copyPaste}</p>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.copyPaste)
                    alert("Código Pix copiado!")
                  }}
                  className="w-full bg-lime-500 hover:bg-lime-600"
                >
                  Copiar Código Pix
                </Button>
                <p className="text-sm text-gray-400 mt-4">Após o pagamento, seu plano será ativado automaticamente</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Tela de Boleto
  if (boletoData) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" /> Boleto Bancário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {paymentStatus === "RECEIVED" || paymentStatus === "CONFIRMED" ? (
              <div className="bg-green-900 border-2 border-green-500 p-6 rounded-lg mb-4 animate-pulse">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-green-400 font-bold text-lg">Pagamento Confirmado!</p>
                <p className="text-green-300 text-sm mt-2">Redirecionando para sua conta...</p>
              </div>
            ) : (
              <>
                <p className="text-gray-300 mb-4">Seu boleto foi gerado com sucesso!</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => window.open(boletoData.url, "_blank")}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Abrir Boleto
                  </Button>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Código de barras:</p>
                    <p className="text-xs text-gray-300 break-all font-mono">{boletoData.barCode}</p>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(boletoData.barCode)
                      alert("Código copiado!")
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700"
                  >
                    Copiar Código de Barras
                  </Button>
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Vencimento em 3 dias. Após o pagamento, seu plano será ativado automaticamente.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Formulário de cartão
  if (paymentMethod === "card") {
    return (
      <form onSubmit={handleAsaasPayment} className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CreditCard className="h-5 w-5 mr-2" /> Dados do Cartão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentStatus === "RECEIVED" || paymentStatus === "CONFIRMED" ? (
              <div className="bg-green-900 border-2 border-green-500 p-6 rounded-lg mb-4 animate-pulse">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-green-400 font-bold text-lg">Pagamento Confirmado!</p>
                <p className="text-green-300 text-sm mt-2">Redirecionando para sua conta...</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome no Cartão</label>
                  <Input
                    value={cardData.holderName}
                    onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })}
                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Número do Cartão</label>
                  <Input
                    value={cardData.number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 16)
                      const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ")
                      setCardData({ ...cardData, number: formatted })
                    }}
                    placeholder="0000 0000 0000 0000"
                    className="bg-gray-700 border-gray-600 text-white"
                    maxLength={19}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Mês</label>
                    <Input
                      value={cardData.expiryMonth}
                      onChange={(e) =>
                        setCardData({ ...cardData, expiryMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })
                      }
                      placeholder="MM"
                      className="bg-gray-700 border-gray-600 text-white"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Ano</label>
                    <Input
                      value={cardData.expiryYear}
                      onChange={(e) =>
                        setCardData({ ...cardData, expiryYear: e.target.value.replace(/\D/g, "").slice(0, 4) })
                      }
                      placeholder="AAAA"
                      className="bg-gray-700 border-gray-600 text-white"
                      maxLength={4}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">CVV</label>
                    <Input
                      value={cardData.ccv}
                      onChange={(e) => setCardData({ ...cardData, ccv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="000"
                      className="bg-gray-700 border-gray-600 text-white"
                      maxLength={4}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">CEP</label>
                    <Input
                      value={addressData.postalCode}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "")
                        if (value.length <= 8) {
                          value = value.replace(/(\d{5})(\d)/, "$1-$2")
                        }
                        setAddressData({ ...addressData, postalCode: value })
                      }}
                      placeholder="00000-000"
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 [&::placeholder]:text-gray-500"
                      maxLength={9}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Número</label>
                    <Input
                      value={addressData.addressNumber}
                      onChange={(e) => setAddressData({ ...addressData, addressNumber: e.target.value })}
                      placeholder="123"
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 [&::placeholder]:text-gray-500"
                      required
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Parcelamento */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Parcelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {installmentOptions.map((option) => {
                const value = currentPlan.total / option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setInstallments(option)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      installments === option
                        ? "border-lime-400 bg-lime-400/10 text-lime-400"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{option}x sem juros</span>
                      <span className="text-sm">{formatCurrency(value)}/mês</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <button
          type="submit"
          disabled={processing}
          className={`w-full py-4 text-lg font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all ${
            processing ? "opacity-75 cursor-not-allowed" : ""
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processando...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Lock className="h-5 w-5" />
              <span>
                Pagar {installments}x de {formatCurrency(currentPlan.total / installments)}
              </span>
            </div>
          )}
        </button>
      </form>
    )
  }

  // Botão para Pix e Boleto
  return (
    <button
      onClick={handleAsaasPayment}
      disabled={processing}
      className={`w-full py-4 text-lg font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all ${
        processing ? "opacity-75 cursor-not-allowed" : ""
      }`}
    >
      {processing ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          Gerando...
        </div>
      ) : (
        `Gerar ${paymentMethod === "pix" ? "Pix" : "Boleto"}`
      )}
    </button>
  )
}

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, title: "Escolher Plano", icon: ShoppingCart },
    { number: 2, title: "Dados Pessoais", icon: User },
    { number: 3, title: "Pagamento", icon: CreditCard },
  ]

  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4 text-gray-400 text-sm">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep >= step.number
          const isCompleted = currentStep > step.number

          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isActive ? "bg-lime-500 text-white" : "bg-gray-600 text-gray-400"
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="mt-1 text-xs text-gray-300 text-center">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 ${isActive ? "bg-lime-500" : "bg-gray-600"}`}></div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const discountParam = searchParams.get("discount")
  const discount = discountParam ? Number.parseInt(discountParam) : 0

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", cpf: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<any>(null)
  const [clientUid, setClientUid] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null) // Declare setPaymentId here
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null) // Declare setPaymentStatus here

  // Escutar mudanças em tempo real do status do pagamento
  useEffect(() => {
    console.log("[v0] CHECKOUT_LISTENER - useEffect iniciado, paymentId:", paymentId)
    if (!paymentId) {
      console.log("[v0] CHECKOUT_LISTENER - Sem paymentId, não iniciando onSnapshot")
      return
    }

    try {
      const paymentDocRef = doc(db, "payments", paymentId)

      console.log("[v0] CHECKOUT_LISTENER - Iniciando onSnapshot para paymentId:", paymentId)
      const unsubscribe = onSnapshot(paymentDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const paymentData = snapshot.data()
          console.log("[v0] CHECKOUT_LISTENER - Documento atualizado, status:", paymentData.status)
          setPaymentStatus(paymentData.status)

          // Se pagamento foi confirmado, redirecionar para sucesso
          if (paymentData.status === "RECEIVED" || paymentData.status === "CONFIRMED") {
            console.log("[v0] CHECKOUT_LISTENER - Pagamento confirmado! Status:", paymentData.status)
            console.log("[v0] CHECKOUT_LISTENER - Redirecionando para success em 2 segundos...")
            unsubscribe()
            // Dar tempo para mostrar feedback visual
            setTimeout(() => {
              window.location.href = "/success"
            }, 2000)
          }
        } else {
          console.log("[v0] CHECKOUT_LISTENER - Documento não encontrado ainda")
        }
      })

      return () => {
        console.log("[v0] CHECKOUT_LISTENER - Limpando onSnapshot listener")
        unsubscribe()
      }
    } catch (error) {
      console.error("[v0] CHECKOUT_LISTENER - Erro ao configurar onSnapshot:", error)
    }
  }, [paymentId])

  const plans = [
    {
      id: "mensal",
      key: "mensal",
      name: "Plano Mensal",
      price: "R$ 79,90",
      total: 79.9,
      description: "Acesso completo por 30 dias",
    },
    {
      id: "trimestral",
      key: "trimestral",
      name: "Plano Trimestral",
      price: "R$ 159,90",
      total: 159.9,
      description: "Acesso completo por 90 dias",
    },
    {
      id: "semestral",
      key: "semestral",
      name: "Plano Semestral",
      price: "R$ 239,90",
      total: 239.9,
      description: "Acesso completo por 180 dias",
    },
  ]

  const getDiscountedPlan = (plan: any, discountPercent: number) => {
    if (!discountPercent) return { ...plan, originalPrice: plan.total * 1.4 }

    // O 'total' que o usuário paga será sempre o seu preço original
    // O 'originalPrice' (riscado) é calculado para fazer o desconto parecer real
    const factor = 1 - discountPercent / 100
    return {
      ...plan,
      originalPrice: plan.total / factor,
      discountedTotal: plan.total,
    }
  }

  const discountedPlans = plans.map((plan) => getDiscountedPlan(plan, discount))

  const currentPlanData = discountedPlans.find((p) => p.key === selectedPlan) || discountedPlans[0]

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = localStorage.getItem("quizData")

        if (stored) {
          const parsed = JSON.parse(stored)
          setQuizAnswers(parsed)
          setFormData((prev) => ({ ...prev, name: parsed.name || "", email: parsed.email || "" }))
          setUserEmail(parsed.email || null)
        }

        // Usar onAuthStateChanged como ÚNICA fonte de verdade para clientUid
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Usuário autenticado (normal ou anônimo)
            setClientUid(user.uid)
            localStorage.setItem("clientUid", user.uid)
            console.log("[v0] ClientUid definido:", user.uid)

            if (!stored) {
              try {
                const docRef = doc(db, "users", user.uid)
                const snap = await getDoc(docRef)
                if (snap.exists()) {
                  const data = snap.data()
                  setQuizAnswers(data)
                  setFormData((prev) => ({ ...prev, name: data.name || "", email: data.email || "" }))
                  setUserEmail(data.email || null)
                }
              } catch (firebaseError) {
                console.error("Erro ao buscar dados do Firebase:", firebaseError)
              }
            }

            if (user.uid) {
              fetch("/api/generate-plans-on-demand", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.uid }),
              }).catch((err) => console.error("Erro ao gerar planos:", err))
            }
          } else {
            // Nenhum usuário autenticado - fazer login anônimo
            try {
              const anonUser = await signInAnonymously(auth)
              setClientUid(anonUser.user.uid)
              localStorage.setItem("clientUid", anonUser.user.uid)
              console.log("[v0] Login anônimo, clientUid definido:", anonUser.user.uid)
            } catch (anonError) {
              console.error("[v0] Erro ao fazer login anônimo:", anonError)
            }
          }
          setLoading(false)
        })
      } catch (err) {
        console.error("Erro geral:", err)
        setError("Erro ao carregar dados. Por favor, refaça o quiz.")
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handlePaymentSuccess = () => router.push("/success?embedded=true")
  const handlePaymentError = (msg: string) => setError(msg)

  if (loading) return <div className="flex justify-center items-center min-h-screen text-white">Carregando...</div>
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-8">Escolha seu Plano</h1>

        <ProgressIndicator currentStep={currentStep} />

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {discountedPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all duration-200 relative ${
                selectedPlan === plan.key
                  ? "bg-gray-700 border-2 border-lime-500 ring-2 ring-lime-500/20 transform scale-105"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600"
              }`}
              onClick={() => setSelectedPlan(plan.key)}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  RECOMENDADO
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                  {selectedPlan === plan.key && <Check className="h-5 w-5 text-lime-500" />}
                </div>
                <p className="text-gray-400 text-sm">{plan.description}</p>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-2">
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                </div>
                <p className="text-gray-300">Continue preenchendo os dados abaixo</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview do Total */}
        {selectedPlan ? (
          <div className="text-center mb-8 p-6 bg-gray-800 rounded-lg border border-lime-500">
            <div className="flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-lime-500 mr-2" />
              <p className="text-lime-400 font-semibold">Plano Selecionado: {currentPlanData?.name}</p>
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              Total: {formatCurrency(currentPlanData?.total || 0)}
            </div>
            <p className="text-gray-300">Continue preenchendo os dados abaixo</p>
          </div>
        ) : (
          <div className="text-center mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">Selecione um plano acima para continuar</p>
          </div>
        )}

        {/* Formulário */}
        {selectedPlan && (
          <>
            <Card className="bg-gray-800 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                    <Input value={formData.name} readOnly className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <Input value={formData.email} readOnly className="bg-gray-700 border-gray-600 text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Telefone *</label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">CPF *</label>
                    <Input
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "")
                        if (value.length <= 11) {
                          value = value.replace(/(\d{3})(\d)/, "$1.$2")
                          value = value.replace(/(\d{3})(\d)/, "$1.$2")
                          value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
                        }
                        setFormData((prev) => ({ ...prev, cpf: value }))
                      }}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      maxLength={14}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seleção de método de pagamento */}
            {formData.phone && formData.cpf && (
              <>
                <PaymentMethodSelector onSelect={setPaymentMethod} selected={paymentMethod} />

                {/* Componente de pagamento */}
                {paymentMethod && (
                  <AsaasPaymentForm
                    formData={formData}
                    currentPlan={currentPlanData}
                    userEmail={userEmail}
                    clientUid={clientUid}
                    paymentMethod={paymentMethod}
                    onError={handlePaymentError}
                    onSuccess={handlePaymentSuccess}
                    paymentId={paymentId} // Pass paymentId to AsaasPaymentForm
                    setPaymentId={setPaymentId} // Pass setPaymentId to AsaasPaymentForm
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Garantias */}
        <div className="mt-12 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>Pagamento Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>SSL Certificado</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              <span>Asaas Protegido</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
