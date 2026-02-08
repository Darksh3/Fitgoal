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
import { motion } from "framer-motion"
import { doc, onSnapshot, setDoc, db, auth } from "@/lib/firebaseClient"
import { onAuthStateChanged } from "firebase/auth"
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
