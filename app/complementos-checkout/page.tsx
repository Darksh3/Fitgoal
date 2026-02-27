"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check } from "lucide-react"

interface OrderBumpItem {
  id: "ebook" | "protocolo"
  name: string
  description: string
  price: number
  originalPrice: number
  icon: string
}

const ORDER_BUMPS_DATA: Record<string, OrderBumpItem> = {
  ebook: {
    id: "ebook",
    name: "eBook",
    description: "Guia completo com dicas e estratégias para sua transformação corporal.",
    price: 29.9,
    originalPrice: 49.9,
    icon: "📚",
  },
  protocolo: {
    id: "protocolo",
    name: "Protocolo",
    description: "Protocolo exclusivo com exercícios avançados e técnicas especializadas.",
    price: 39.9,
    originalPrice: 69.9,
    icon: "📋",
  },
}

function ComplementosCheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  
  const [selectedItems, setSelectedItems] = useState<("ebook" | "protocolo")[]>([])
  const [processing, setProcessing] = useState(false)

  const itemParam = searchParams.get("item")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth")
      return
    }

    if (itemParam && (itemParam === "ebook" || itemParam === "protocolo")) {
      setSelectedItems([itemParam])
    }
  }, [user, loading, router, itemParam])

  const toggleItem = (id: "ebook" | "protocolo") => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const calculateTotal = () => {
    return selectedItems.reduce((sum, id) => sum + ORDER_BUMPS_DATA[id].price, 0)
  }

  const calculateSavings = () => {
    return selectedItems.reduce(
      (sum, id) => sum + (ORDER_BUMPS_DATA[id].originalPrice - ORDER_BUMPS_DATA[id].price),
      0
    )
  }

  const handleCheckout = async () => {
    if (selectedItems.length === 0 || !user?.uid) return

    setProcessing(true)

    try {
      console.log("[v0] COMPLEMENTOS_CHECKOUT - Iniciando checkout com itens:", selectedItems)

      // Aqui você chamaria a API de checkout similar à do checkout principal
      // Por enquanto, vamos simular e redirecionar para a página de checkout existente
      // com os complementos pré-selecionados

      const orderBumpsObj = {
        ebook: selectedItems.includes("ebook"),
        protocolo: selectedItems.includes("protocolo"),
      }

      console.log("[v0] COMPLEMENTOS_CHECKOUT - Order bumps:", orderBumpsObj)

      // Redirect para checkout principal com os itens selecionados
      const checkoutUrl = new URL("/checkout", window.location.origin)
      checkoutUrl.searchParams.set("bumps", JSON.stringify(orderBumpsObj))
      router.push(checkoutUrl.toString())
    } catch (error) {
      console.error("[v0] COMPLEMENTOS_CHECKOUT - Erro:", error)
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  const total = calculateTotal()
  const savings = calculateSavings()

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Complementos</h1>
          <p className="text-gray-600 dark:text-gray-400">Selecione os complementos que deseja adquirir</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seleção de complementos */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(ORDER_BUMPS_DATA).map(([key, bump]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all border-2 ${
                selectedItems.includes(bump.id)
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => toggleItem(bump.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-1">
                    <div
                      className={`h-6 w-6 rounded border-2 flex items-center justify-center ${
                        selectedItems.includes(bump.id)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {selectedItems.includes(bump.id) && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl">{bump.icon}</span>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {bump.name}
                          </h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                          {bump.description}
                        </p>
                      </div>
                    </div>

                    {/* Preço */}
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        R$ {bump.price.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 line-through">
                        R$ {bump.originalPrice.toFixed(2)}
                      </div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Economize R$ {(bump.originalPrice - bump.price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumo de pedido */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedItems.length > 0 ? (
                <>
                  <div className="space-y-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                    {selectedItems.map((id) => (
                      <div key={id} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {ORDER_BUMPS_DATA[id].name}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          R$ {ORDER_BUMPS_DATA[id].price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {savings > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <p className="text-sm text-green-700 dark:text-green-400">
                        <span className="font-bold">Você economiza:</span> R$ {savings.toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        R$ {total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={processing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
                  >
                    {processing ? "Processando..." : "Prosseguir para Pagamento"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Selecione pelo menos um complemento para continuar
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    Prosseguir para Pagamento
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => router.push("/dashboard/complementos")}
                  variant="ghost"
                  className="w-full"
                >
                  Voltar para Complementos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function ComplementosCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Carregando checkout...</p>
          </div>
        </div>
      }
    >
      <ComplementosCheckoutContent />
    </Suspense>
  )
}
