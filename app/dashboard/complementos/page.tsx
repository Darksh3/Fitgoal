"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebaseClient"
import { Lock, Download, ShoppingCart } from "lucide-react"

interface OrderBumpStatus {
  ebook: boolean
  protocolo: boolean
}

interface OrderBump {
  id: string
  name: string
  description: string
  cover: string
  purchaseStatus: "purchased" | "locked"
  downloadUrl?: string
}

export default function ComplementosPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [orderBumpsStatus, setOrderBumpsStatus] = useState<OrderBumpStatus | null>(null)
  const [loadingBumps, setLoadingBumps] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setLoading(false)
        // Chamar checkOrderBumps aqui após autenticação
        checkOrderBumps(currentUser.uid)
      } else {
        setLoading(false)
        router.push("/auth")
      }
    })

    return () => unsubscribe()
  }, [router])

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
      name: "Protocolo Anti-Plateau",
      description: "Reverta a estagnação de peso em 7 dias com protocolos comprovados baseados em ciência.",
      cover: "/order-bump-protocol-metabolico.jpg",
      purchaseStatus: orderBumpsStatus?.ebook ? "purchased" : "locked",
      downloadUrl: "/downloads/ebook.pdf",
    },
    {
      id: "protocolo",
      name: "Protocolo S.O.S FitGoal",
      description: "Protocolo de emergência para quando você desliza na dieta. Recupere o controle em 48 horas.",
      cover: "/order-bump-protocolo-sos.jpg",
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
          <div key={bump.id} className="flex flex-col gap-4">
            {/* Card com imagem da capa */}
            <div className="relative overflow-hidden rounded-lg shadow-lg">
              <Image
                src={bump.cover}
                alt={bump.name}
                width={400}
                height={500}
                className={`w-full h-auto object-cover transition-all ${
                  bump.purchaseStatus === "locked" ? "blur-sm" : ""
                }`}
              />
              
              {/* Lock overlay para itens bloqueados */}
              {bump.purchaseStatus === "locked" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="h-16 w-16 text-white mx-auto mb-2" />
                    <p className="text-white font-bold text-lg">Bloqueado</p>
                  </div>
                </div>
              )}

              {/* Badge de adquirido */}
              {bump.purchaseStatus === "purchased" && (
                <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <span>✓</span>
                  <span>Adquirido</span>
                </div>
              )}
            </div>

            {/* Informações e botão */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{bump.name}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
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
