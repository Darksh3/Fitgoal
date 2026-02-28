"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Check } from "lucide-react"
import Image from "next/image"

interface OrderBumpItem {
  id: "ebook" | "protocolo"
  name: string
  description: string
  price: number
  originalPrice: number
  image: string
}

const ORDER_BUMPS_DATA: Record<string, OrderBumpItem> = {
  ebook: {
    id: "ebook",
    name: "Protocolo Anti-Plateau",
    description: "Reverta a estagnação de peso em 7 dias com protocolos comprovados baseados em ciência.",
    price: 14.9,
    originalPrice: 29.9,
    image: "/order-bump-protocol-metabolico.jpg",
  },
  protocolo: {
    id: "protocolo",
    name: "Protocolo S.O.S FitGoal",
    description: "Protocolo de emergência para quando você desliza na dieta. Recupere o controle em 48 horas.",
    price: 14.9,
    originalPrice: 29.9,
    image: "/order-bump-protocolo-sos.jpg",
  },
}

function ComplementosCheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [selectedItems, setSelectedItems] = useState<("ebook" | "protocolo")[]>([])
  const [processing, setProcessing] = useState(false)

  const itemParam = searchParams.get("item")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setLoading(false)
        
        // Se vem com um item pré-selecionado, adicionar à lista
        if (itemParam && (itemParam === "ebook" || itemParam === "protocolo")) {
          setSelectedItems([itemParam])
        }
      } else {
        setLoading(false)
        router.push("/auth")
      }
    })

    return () => unsubscribe()
  }, [router, itemParam])

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
      checkoutUrl.searchParams.set("complementosOnly", "true")
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
              className={`cursor-pointer transition-all border-2 overflow-hidden ${
                selectedItems.includes(bump.id)
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => toggleItem(bump.id)}
            >
              <CardContent className="p-0">
                <div className="flex items-start gap-0 md:gap-4 flex-col md:flex-row">
                  {/* Checkbox e Imagem */}
                  <div className="relative flex-shrink-0 w-full md:w-40 h-40 md:h-auto">
                    {/* Imagem */}
                    <Image
                      src={bump.image}
                      alt={bump.name}
                      width={180}
                      height={200}
                      className="w-full h-40 object-cover"
                    />
                    
                    {/* Checkbox overlay */}
                    <div className="absolute top-2 left-2">
                      <div
                        className={`h-6 w-6 rounded border-2 flex items-center justify-center cursor-pointer ${
                          selectedItems.includes(bump.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        }`}
                      >
                        {selectedItems.includes(bump.id) && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 p-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {bump.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{bump.description}</p>
                  </div>
                </div>

                {/* Preço */}
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        R$ {bump.price.toFixed(2).replace(".", ",")}
                      </div>
                      <div className="text-sm text-gray-500 line-through">
                        R$ {bump.originalPrice.toFixed(2).replace(".", ",")}
                      </div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        Economize R$ {(bump.originalPrice - bump.price).toFixed(2).replace(".", ",")}
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
