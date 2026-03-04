"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle2, Loader2, QrCode } from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import Link from "next/link"

interface PaymentFormData {
  email: string
  name: string
  cpf: string
  phone: string
}

const PLANS = {
  mensal: { name: "Mensal", price: 79, months: 1 },
  trimestral: { name: "Trimestral", price: 189, months: 3 },
  semestral: { name: "Semestral", price: 339, months: 6 },
}

export default function CheckoutOfertaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const planParam = (searchParams.get("plan") || "semestral") as keyof typeof PLANS
  const plan = PLANS[planParam]
  
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "boleto" | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string } | null>(null)
  const [boletoData, setBoletoData] = useState<{ url: string; barCode: string } | null>(null)
  
  const [formData, setFormData] = useState<PaymentFormData>({
    email: "",
    name: "",
    cpf: "",
    phone: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePayment = async (method: "pix" | "boleto") => {
    if (!formData.email || !formData.name || !formData.cpf || !formData.phone) {
      setError("Por favor, preencha todos os campos")
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/checkout-oferta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          plan: planParam,
          paymentMethod: method,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao processar pagamento")
        return
      }

      if (method === "pix") {
        setPixData({ qrCode: data.qrCode, copyPaste: data.copyPaste })
      } else {
        setBoletoData({ url: data.url, barCode: data.barCode })
      }
      setPaymentMethod(method)
    } catch (err) {
      setError("Erro ao conectar com o servidor")
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardContent className="pt-8">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Pagamento Processado!</h2>
              <p className="text-slate-300 mb-6">Você receberá um email de confirmação em breve.</p>
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (pixData || boletoData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              {pixData ? "Pagamento via PIX" : "Pagamento via Boleto"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pixData ? (
              <>
                <img src={pixData.qrCode} alt="QR Code PIX" className="w-full border border-slate-600 rounded" />
                <div className="bg-slate-700 p-3 rounded text-center">
                  <p className="text-sm text-slate-300 mb-2">Código para copiar e colar:</p>
                  <p className="text-xs text-slate-200 break-all font-mono">{pixData.copyPaste}</p>
                  <Button
                    onClick={() => navigator.clipboard.writeText(pixData.copyPaste)}
                    className="w-full mt-2 text-xs"
                  >
                    Copiar Código
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-300">Código de barras:</p>
                <div className="bg-slate-700 p-3 rounded">
                  <p className="text-center font-mono text-sm text-slate-200">{boletoData?.barCode}</p>
                </div>
                <a
                  href={boletoData?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full">Baixar Boleto</Button>
                </a>
              </>
            )}
            <p className="text-sm text-slate-400">
              Você receberá email de confirmação assim que o pagamento for processado.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4">
      <div className="max-w-md mx-auto py-8">
        <Link href="/" className="text-slate-400 hover:text-slate-200 mb-6 inline-block">
          ← Voltar
        </Link>

        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Plano: {plan.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500 mb-2">
              {formatCurrency(plan.price)}
            </div>
            <p className="text-slate-300">{plan.months} mês(es) de acesso</p>
          </CardContent>
        </Card>

        <form className="space-y-4 mb-6">
          <Input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
            className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          />
          <Input
            type="text"
            name="name"
            placeholder="Nome completo"
            value={formData.name}
            onChange={handleInputChange}
            className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          />
          <Input
            type="text"
            name="cpf"
            placeholder="CPF (apenas números)"
            value={formData.cpf}
            onChange={handleInputChange}
            maxLength={11}
            className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          />
          <Input
            type="text"
            name="phone"
            placeholder="Telefone"
            value={formData.phone}
            onChange={handleInputChange}
            className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
          />
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded p-3 mb-4 flex gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => handlePayment("pix")}
            disabled={processing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
            Pagar com PIX
          </Button>
          <Button
            onClick={() => handlePayment("boleto")}
            disabled={processing}
            variant="outline"
            className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Pagar com Boleto
          </Button>
        </div>
      </div>
    </div>
  )
}
