"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreditCard, Check, ShoppingCart, User, Lock, QrCode, FileText, Smartphone, ArrowLeft } from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { motion } from "framer-motion"

type PaymentMethod = "pix" | "boleto" | "card"

function PaymentMethodSelector({
  onSelect,
  selected,
}: { onSelect: (method: PaymentMethod) => void; selected: PaymentMethod | null }) {
  const methods = [
    { id: "pix" as PaymentMethod, name: "Pix", icon: Smartphone, description: "Pagamento instantâneo" },
    { id: "boleto" as PaymentMethod, name: "Boleto", icon: FileText, description: "Vencimento em 3 dias" },
    { id: "card" as PaymentMethod, name: "Cartão", icon: CreditCard, description: "Parcelamento disponível" },
  ]

  return (
    <Card className="bg-gray-800 border-gray-700 mb-6">
      <CardHeader>
        <CardTitle className="text-white">Método de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {methods.map((method) => {
          const Icon = method.icon
          return (
            <button
              key={method.id}
              onClick={() => onSelect(method.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 ${
                selected === method.id
                  ? "border-blue-600 bg-blue-600/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <Icon className={`h-6 w-6 ${selected === method.id ? "text-blue-600" : "text-gray-400"}`} />
              <div className="flex-1 text-left">
                <div className={`font-semibold ${selected === method.id ? "text-blue-600" : "text-white"}`}>
                  {method.name}
                </div>
                <div className="text-sm text-gray-400">{method.description}</div>
              </div>
              {selected === method.id && <Check className="h-5 w-5 text-blue-600" />}
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}

function AsaasPaymentForm({ formData, currentPlan, userEmail, clientUid, paymentMethod, onError, onSuccess }: any) {
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
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; paymentId: string } | null>(null)
  const [boletoData, setBoletoData] = useState<{ url: string; barCode: string } | null>(null)

  // Polling para PIX - verifica a cada 5 segundos se o pagamento foi confirmado
  useEffect(() => {
    if (!pixData?.paymentId || paymentMethod !== "pix") return

    const interval = setInterval(async () => {
      try {
        console.log("[v0] PIX_POLLING - Verificando status do pagamento PIX:", pixData.paymentId)
        const response = await fetch(`/api/check-payment-status?paymentId=${pixData.paymentId}`)
        const data = await response.json()

        if (data.status === "CONFIRMED" || data.status === "APPROVED") {
          console.log("[v0] PIX_CONFIRMED - Pagamento PIX confirmado!")
          clearInterval(interval)
          // Aguarda 2 segundos para o webhook processar completamente
          setTimeout(() => {
            window.location.href = "/success"
          }, 2000)
        }
      } catch (error) {
        console.error("[v0] PIX_POLLING_ERROR - Erro ao verificar status:", error)
      }
    }, 5000) // Verifica a cada 5 segundos

    return () => clearInterval(interval)
  }, [pixData?.paymentId, paymentMethod])

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

      console.log("[v0] === COMPREHENSIVE FIELD VALIDATION START ===")

      const missingFields = []

      if (!formData.email?.trim()) missingFields.push("Email")
      if (!formData.name?.trim()) missingFields.push("Nome Completo")
      if (!formData.cpf?.trim()) missingFields.push("CPF")
      if (!formData.phone?.trim()) missingFields.push("Telefone")

      console.log("[v0] Email:", formData.email, "| Valid:", !!formData.email?.trim())
      console.log("[v0] Name:", formData.name, "| Valid:", !!formData.name?.trim())
      console.log("[v0] CPF:", formData.cpf, "| Valid:", !!formData.cpf?.trim())
      console.log("[v0] Phone:", formData.phone, "| Valid:", !!formData.phone?.trim())
      console.log("[v0] Plan Type:", currentPlan?.key, "| Valid:", !!currentPlan?.key)
      console.log("[v0] Payment Method:", paymentMethod, "| Valid:", !!paymentMethod)
      console.log("[v0] Client UID:", clientUid, "| Valid:", !!clientUid)

      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(", ")}`)
      }

      console.log("[v0] === ALL BASIC FIELDS VALID ===")

      if (paymentMethod === "card") {
        console.log("[v0] === CARD PAYMENT VALIDATION START ===")
        const cardMissingFields = []

        if (!cardData.holderName?.trim()) cardMissingFields.push("Nome no Cartão")
        if (!cardData.number?.replace(/\s/g, "")) cardMissingFields.push("Número do Cartão")
        if (!cardData.expiryMonth) cardMissingFields.push("Mês de Validade")
        if (!cardData.expiryYear) cardMissingFields.push("Ano de Validade")
        if (!cardData.ccv) cardMissingFields.push("CVV")
        if (!addressData.postalCode?.replace(/\D/g, "")) cardMissingFields.push("CEP")
        if (!addressData.addressNumber?.trim()) cardMissingFields.push("Número do Endereço")

        console.log("[v0] Card Fields Valid:", {
          holderName: !!cardData.holderName?.trim(),
          number: !!cardData.number?.replace(/\s/g, ""),
          expiryMonth: !!cardData.expiryMonth,
          expiryYear: !!cardData.expiryYear,
          ccv: !!cardData.ccv,
          postalCode: !!addressData.postalCode?.replace(/\D/g, ""),
          addressNumber: !!addressData.addressNumber?.trim(),
        })

        if (cardMissingFields.length > 0) {
          throw new Error(`Campos do cartão faltando: ${cardMissingFields.join(", ")}`)
        }

        console.log("[v0] === ALL CARD FIELDS VALID ===")
      }

      const paymentPayload: Record<string, any> = {
        email: formData.email,
        name: formData.name,
        cpf: formData.cpf.replace(/\D/g, ""), // Send only numbers for CPF
        phone: formData.phone.replace(/\D/g, ""), // Send only numbers for phone
        planType: currentPlan.key,
        paymentMethod: paymentMethod === "card" ? "card" : paymentMethod, // Keep as "pix", "boleto", or "card"
        description: `${currentPlan.name} - Fitgoal Fitness`,
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

      console.log("[v0] === PAYMENT PAYLOAD READY ===")
      console.log("[v0] Complete Payload:", paymentPayload)

      const paymentResponse = await fetch("/api/create-asaas-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentPayload),
      })

      console.log("[v0] API Response Status:", paymentResponse.status)

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        console.log("[v0] === API ERROR ===")
        console.log("[v0] Full Error Response:", errorData)
        console.log("[v0] Error Message:", errorData.error || "Erro desconhecido")
        console.log("[v0] Error Details:", errorData.details || "Sem detalhes")
        throw new Error(errorData.error || "Erro ao criar cobrança")
      }

      const paymentResult = await paymentResponse.json()
      console.log("[v0] Payment Result:", paymentResult)

      if (paymentMethod === "pix") {
        const qrCodeResponse = await fetch(`/api/get-pix-qrcode?paymentId=${paymentResult.paymentId}`)

        if (qrCodeResponse.ok) {
          const qrCodeResult = await qrCodeResponse.json()
          setPixData({
            qrCode: qrCodeResult.encodedImage || qrCodeResult.qrCode,
            copyPaste: qrCodeResult.payload,
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
        console.log("[v0] Card Payment Payload:", cardPayload)
        console.log("[v0] Address Data Being Sent:", addressData)
        console.log("[v0] Postal Code Value:", addressData.postalCode)
        console.log("[v0] Address Number Value:", addressData.addressNumber)

        const cardResponse = await fetch("/api/process-asaas-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cardPayload),
        })

        console.log("[v0] Card API Response Status:", cardResponse.status)

        if (!cardResponse.ok) {
          const errorData = await cardResponse.json()
          console.log("[v0] Card API Error Response:", errorData)
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
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Copiar Código Pix
            </Button>
            <p className="text-sm text-gray-400 mt-4">Após o pagamento, seu plano será ativado automaticamente</p>
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
            {(paymentMethod === "boleto" || paymentMethod === "card") && (
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
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
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
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
                        ? "border-blue-600 bg-blue-600/10 text-blue-600"
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
    { number: 1, title: "Dados Pessoais", icon: User },
    { number: 2, title: "Pagamento", icon: CreditCard },
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
                    isActive ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-400"
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className="mt-1 text-xs text-gray-300 text-center">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 ${isActive ? "bg-blue-600" : "bg-gray-600"}`}></div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  selectedPlan: string | null
}

export default function CheckoutModal({ isOpen, onClose, selectedPlan }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", cpf: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<any>(null)
  const [clientUid, setClientUid] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

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

  const currentPlanData = plans.find((p) => p.key === selectedPlan) || plans[0]

  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const stored = localStorage.getItem("quizData")

        if (stored) {
          const parsed = JSON.parse(stored)
          setQuizAnswers(parsed)
          console.log("[v0] Initializing formData - Email from quiz:", parsed.email)
          setFormData((prev) => ({
            ...prev,
            name: parsed.name || "",
            email: parsed.email || "", // Ensure email is set
            cpf: parsed.cpf || "",
            phone: parsed.phone || "",
          }))
        }

        setLoading(false)
      } catch (error) {
        console.error("Error loading quiz data:", error)
        setError("Erro ao carregar dados")
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen])

  const handleFormChange = (field: string, value: string) => {
    console.log(`[v0] Form field changed - ${field}: ${value}`) // Adding debug log to track form changes
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNextStep = () => {
    console.log("[v0] Form Data:", {
      name: formData.name,
      email: formData.email,
      cpf: formData.cpf,
      phone: formData.phone,
    })

    if (!formData.name || !formData.cpf || !formData.phone) {
      console.log("[v0] Validation failed - Missing fields:")
      console.log("[v0] - Name:", !formData.name ? "MISSING" : "OK")
      console.log("[v0] - CPF:", !formData.cpf ? "MISSING" : "OK")
      console.log("[v0] - Phone:", !formData.phone ? "MISSING" : "OK")
      setError("Por favor, preencha todos os campos")
      return
    }

    console.log("[v0] Validation passed - Moving to step 2")
    setError(null)
    setCurrentStep(2)
  }

  const handleError = (errorMsg: string) => {
    setError(errorMsg)
  }

  const handleSuccess = () => {
    console.log("[v0] CHECKOUT_SUCCESS - Aguardando processamento do webhook...")
    // Espera 3 segundos para o webhook processar o pagamento antes de redirecionar
    setTimeout(() => {
      console.log("[v0] CHECKOUT_REDIRECT - Redirecionando para /success")
      window.location.href = "/success"
    }, 3000)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader className="flex justify-center items-center relative">
          {currentStep === 2 && (
            <button
              onClick={() => setCurrentStep(1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <DialogTitle className="text-2xl font-bold text-white">Finalizar Compra</DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <ProgressIndicator currentStep={currentStep} />

          {error && <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg text-red-300">{error}</div>}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : currentStep === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> Plano Selecionado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-white">
                    <p className="text-lg font-semibold">{currentPlanData.name}</p>
                    <p className="text-gray-400 text-sm">{currentPlanData.description}</p>
                    <p className="text-orange-400 text-2xl font-bold mt-2">{currentPlanData.price}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="h-5 w-5" /> Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleFormChange("name", e.target.value)}
                      placeholder="Seu nome"
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <Input
                      value={formData.email}
                      onChange={(e) => handleFormChange("email", e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-gray-700 border-gray-600 text-white !placeholder-gray-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">CPF</label>
                      <Input
                        value={formData.cpf}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, "")
                          if (value.length <= 11) {
                            value = value
                              .replace(/(\d{3})(\d)/, "$1.$2")
                              .replace(/(\d{3})(\d)/, "$1.$2")
                              .replace(/(\d{3})(\d{1,2})/, "$1-$2")
                          }
                          handleFormChange("cpf", value)
                        }}
                        placeholder="000.000.000-00"
                        className="bg-gray-700 border-gray-600 text-white !placeholder-gray-500"
                        maxLength={14}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Telefone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, "")
                          if (value.length <= 11) {
                            value = value.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2")
                          }
                          handleFormChange("phone", value)
                        }}
                        placeholder="(00) 00000-0000"
                        className="bg-gray-700 border-gray-600 text-white !placeholder-gray-500"
                        maxLength={15}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <button
                onClick={handleNextStep}
                className="w-full !bg-gradient-to-r !from-blue-600 !to-blue-500 hover:!from-blue-700 hover:!to-blue-600 !text-white !py-6 !text-lg !font-semibold !rounded-lg !transition-all !duration-200 !shadow-lg !border-0 !cursor-pointer"
              >
                Continuar para Pagamento
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <PaymentMethodSelector onSelect={setPaymentMethod} selected={paymentMethod} />

              {paymentMethod && (
                <AsaasPaymentForm
                  formData={formData}
                  currentPlan={currentPlanData}
                  userEmail={userEmail}
                  clientUid={clientUid}
                  paymentMethod={paymentMethod}
                  onError={handleError}
                  onSuccess={handleSuccess}
                />
              )}
            </motion.div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
