"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreditCard, Check, ShoppingCart, User, Lock, QrCode, FileText, Smartphone } from "lucide-react"
import { auth, onAuthStateChanged, db } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { formatCurrency } from "@/utils/currency"

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
                  ? "border-lime-400 bg-lime-400/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <Icon className={`h-6 w-6 ${selected === method.id ? "text-lime-400" : "text-gray-400"}`} />
              <div className="flex-1 text-left">
                <div className={`font-semibold ${selected === method.id ? "text-lime-400" : "text-white"}`}>
                  {method.name}
                </div>
                <div className="text-sm text-gray-400">{method.description}</div>
              </div>
              {selected === method.id && <Check className="h-5 w-5 text-lime-400" />}
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
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null)
  const [boletoData, setBoletoData] = useState<{ url: string; barCode: string } | null>(null)

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
      const setError = onError // Declare setError here

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

      // 1. Criar cobrança no Asaas
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

      // 2. Se for Pix, mostrar QR Code
      if (paymentMethod === "pix") {
        setPixData({
          qrCode: paymentResult.pixQrCode,
          copyPaste: paymentResult.pixCopyPaste,
        })
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
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
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
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  required
                />
              </div>
            </div>
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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  const [formData, setFormData] = useState({ name: "", email: "", phone: "", cpf: "" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [quizAnswers, setQuizAnswers] = useState<any>(null)
  const [clientUid, setClientUid] = useState<string | null>(null)

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

        onAuthStateChanged(auth, async (user) => {
          if (user) {
            setClientUid(user.uid)
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

  const plans = {
    mensal: {
      key: "mensal",
      name: "Plano Mensal",
      price: 79.9,
      total: 79.9,
      duration: "1 mês",
      description: "Para experimentar, sem compromisso.",
    },
    trimestral: {
      key: "trimestral",
      name: "Plano Trimestral",
      price: 64.9,
      total: 194.7,
      duration: "3 meses",
      description: "Melhor custo-benefício. Perfeito para ver resultados reais.",
      recommended: true,
    },
    semestral: {
      key: "semestral",
      name: "Plano Semestral",
      price: 49.9,
      total: 299.4,
      duration: "6 meses",
      description: "Para quem quer mudar o corpo de verdade e economizar.",
    },
  }

  const currentPlan = selectedPlan ? plans[selectedPlan as keyof typeof plans] : null

  const getCurrentStep = () => {
    if (!selectedPlan) return 1
    if (!formData.phone || !formData.cpf) return 2
    return 3
  }

  const handlePaymentSuccess = () => router.push("/success?embedded=true")
  const handlePaymentError = (msg: string) => setError(msg)

  if (loading) return <div className="flex justify-center items-center min-h-screen text-white">Carregando...</div>
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-8">Escolha seu Plano</h1>

        <ProgressIndicator currentStep={getCurrentStep()} />

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(plans).map(([key, plan]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all duration-200 relative ${
                selectedPlan === key
                  ? "bg-gray-700 border-2 border-lime-500 ring-2 ring-lime-500/20 transform scale-105"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600"
              }`}
              onClick={() => setSelectedPlan(key)}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  RECOMENDADO
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
                  {selectedPlan === key && <Check className="h-5 w-5 text-lime-500" />}
                </div>
                <p className="text-gray-400 text-sm">{plan.duration}</p>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-2">
                  <span className="text-2xl font-bold text-white">{formatCurrency(plan.price)}</span>
                  <span className="text-gray-400 text-sm">/mês</span>
                </div>
                <div className="mb-4">
                  <span className="text-lg font-semibold text-white">Total: {formatCurrency(plan.total)}</span>
                </div>
                <p className="text-sm text-gray-400 italic">{plan.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview do Total */}
        {selectedPlan ? (
          <div className="text-center mb-8 p-6 bg-gray-800 rounded-lg border border-lime-500">
            <div className="flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-lime-500 mr-2" />
              <p className="text-lime-400 font-semibold">Plano Selecionado: {currentPlan?.name}</p>
            </div>
            <div className="text-3xl font-bold text-white mb-2">Total: {formatCurrency(currentPlan?.total || 0)}</div>
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
                    currentPlan={currentPlan}
                    userEmail={userEmail}
                    clientUid={clientUid}
                    paymentMethod={paymentMethod}
                    onError={handlePaymentError}
                    onSuccess={handlePaymentSuccess}
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
