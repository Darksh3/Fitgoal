"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Lock, Download, ShoppingCart } from "lucide-react"

interface OrderBumpStatus {
  ebook: boolean
  protocolo: boolean
}

interface OrderBump {
  id: string
  name: string
  description: string
  icon: "book" | "file"
  purchaseStatus: "purchased" | "locked"
  downloadUrl?: string
}

export default function ComplementosPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [orderBumpsStatus, setOrderBumpsStatus] = useState<OrderBumpStatus | null>(null)
  const [loadingBumps, setLoadingBumps] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth")
      return
    }

    if (user?.uid) {
      checkOrderBumps(user.uid)
    }
  }, [user, loading, router])

  const checkOrderBumps = async (userId: string) => {
    try {
      console.log("[v0] COMPLEMENTOS - Checando order bumps para userId:", userId)
      const response = await fetch("/api/check-order-bumps-purchased", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] COMPLEMENTOS - Order bumps status:", data)
        setOrderBumpsStatus(data)
      }
    } catch (error) {
      console.error("[v0] COMPLEMENTOS - Erro ao verificar order bumps:", error)
    } finally {
      setLoadingBumps(false)
    }
  }

  const handleAcquire = (bumpType: "ebook" | "protocolo") => {
    router.push(`/complementos-checkout?item=${bumpType}`)
  }

  const orderBumps: OrderBump[] = [
    {
      id: "ebook",
      name: "eBook",
      description: "Guia completo com dicas e estratégias para sua transformação corporal.",
      icon: "book",
      purchaseStatus: orderBumpsStatus?.ebook ? "purchased" : "locked",
      downloadUrl: "/downloads/ebook.pdf",
    },
    {
      id: "protocolo",
      name: "Protocolo",
      description: "Protocolo exclusivo com exercícios avançados e técnicas especializadas.",
      icon: "file",
      purchaseStatus: orderBumpsStatus?.protocolo ? "purchased" : "locked",
      downloadUrl: "/downloads/protocolo.pdf",
    },
  ]

  if (loading || loadingBumps) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando complementos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Complementos</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acesse conteúdos exclusivos para potencializar seus resultados
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {orderBumps.map((bump) => (
          <div
            key={bump.id}
            className={`relative rounded-lg border-2 overflow-hidden transition-all ${
              bump.purchaseStatus === "purchased"
                ? "border-green-500 bg-white dark:bg-gray-800 shadow-lg"
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            }`}
          >
            {/* Lock overlay para itens bloqueados */}
            {bump.purchaseStatus === "locked" && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="text-center">
                  <Lock className="h-16 w-16 text-white mx-auto mb-2" />
                  <p className="text-white font-semibold">Conteúdo Bloqueado</p>
                </div>
              </div>
            )}

            <div className="p-8">
              {/* Header com ícone */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-14 w-14 rounded-lg flex items-center justify-center ${
                      bump.purchaseStatus === "purchased"
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    {bump.icon === "book" ? (
                      <svg
                        className={`h-7 w-7 ${
                          bump.purchaseStatus === "purchased"
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 000-2H7zM4 7a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" />
                      </svg>
                    ) : (
                      <svg
                        className={`h-7 w-7 ${
                          bump.purchaseStatus === "purchased"
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{bump.name}</h2>
                    {bump.purchaseStatus === "purchased" && (
                      <p className="text-sm text-green-600 dark:text-green-400 font-semibold">✓ Adquirido</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                {bump.description}
              </p>

              {/* Botão de ação */}
              {bump.purchaseStatus === "purchased" ? (
                <a
                  href={bump.downloadUrl}
                  download
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="h-5 w-5" />
                  Baixar Agora
                </a>
              ) : (
                <button
                  onClick={() => handleAcquire(bump.id as "ebook" | "protocolo")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Adquirir Agora
                </button>
              )}
            </div>

            {/* Badge de status */}
            <div
              className={`h-1 w-full ${
                bump.purchaseStatus === "purchased" ? "bg-green-500" : "bg-gray-300"
              }`}
            ></div>
          </div>
        ))}
      </div>

      {/* Informações adicionais */}
      <div className="mt-16 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          Potencialize seus Resultados
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Nossos complementos foram desenvolvidos para complementar seu plano de transformação corporal. 
          Acesse conteúdo exclusivo, dicas avançadas e protocolos especializados para atingir seus objetivos ainda mais rápido.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Todas as compras incluem acesso vitalício ao conteúdo.
        </p>
      </div>
    </div>
  )
}
