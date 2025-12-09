"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { CheckCircle, Heart, Target, Calendar, Activity } from "lucide-react"

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      let stored: any = null

      if (typeof window !== "undefined") {
        const local = localStorage.getItem("quizData")
        console.log("localStorage quizData:", local)
        if (local) {
          try {
            stored = JSON.parse(local)
            console.log("Dados do localStorage parseados:", stored)
          } catch (error) {
            console.error("Erro ao parsear localStorage:", error)
          }
        }
      }

      if (!stored && auth.currentUser) {
        console.log("Buscando no Firebase para usuário:", auth.currentUser.uid)
        try {
          const ref = doc(db, "users", auth.currentUser.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            stored = snap.data()
            console.log("Dados do Firebase encontrados:", stored)
          } else {
            console.log("Documento não existe no Firebase")
          }
        } catch (error) {
          console.error("Erro ao buscar no Firebase:", error)
        }
      }

      if (!stored) {
        console.log("Nenhum dado encontrado, redirecionando para /quiz")
        setTimeout(() => {
          router.push("/quiz")
        }, 2000)
        return
      }

      console.log("Dados finais encontrados:", stored)
      setData(stored)
      setLoading(false)
    }

    fetchData()
  }, [router])

  const getGoalText = (goals: string[]) => {
    const goalMap: { [key: string]: string } = {
      "perder-peso": "Perder Peso",
      "ganhar-massa": "Ganhar Massa Muscular",
      "melhorar-saude": "Melhorar Saúde",
      "aumentar-resistencia": "Aumentar Resistência",
    }
    return goals.map((goal) => goalMap[goal] || goal).join(", ")
  }

  const getBodyTypeText = (bodyType: string) => {
    switch (bodyType) {
      case "ectomorfo":
        return "Ectomorfo"
      case "mesomorfo":
        return "Mesomorfo"
      case "endomorfo":
        return "Endomorfo"
      default:
        return "Não especificado"
    }
  }

  const getIMCStatus = (imc: number) => {
    if (imc < 18.5) return "Abaixo do peso"
    if (imc >= 18.5 && imc < 25) return "Peso normal"
    if (imc >= 25 && imc < 30) return "Sobrepeso"
    return "Obesidade"
  }

  const handleGoToCheckout = () => {
    if (!data) return
    router.push("/checkout")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
          <p>Carregando seus resultados...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">Dados do quiz não encontrados</p>
          <Button onClick={() => router.push("/quiz")} className="bg-lime-500 hover:bg-lime-600">
            Refazer Quiz
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Parabéns, <span className="text-lime-400">{data.name}</span>!
          </h1>
          <p className="text-gray-400 text-lg">Seu plano personalizado está pronto</p>
        </div>

        {/* IMC Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Heart className="h-6 w-6 text-lime-500" />
            <h2 className="text-xl font-semibold">Análise do seu IMC</h2>
          </div>
          <div className="text-center space-y-4">
            <div className="text-6xl sm:text-7xl font-bold text-lime-400">{data.imc}</div>
            <p className="text-gray-300 text-lg">
              Calculamos o seu IMC e ele é de <span className="text-lime-400 font-bold">{data.imc}</span>
            </p>
            <p className="text-xl">
              Você está com <span className="text-lime-400 font-bold">{getIMCStatus(Number(data.imc))}</span>
            </p>
          </div>
        </div>

        {/* Objetivo e Tipo de Corpo Grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Objetivo */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-lime-500" />
              <h3 className="text-lg font-semibold">Seu Objetivo</h3>
            </div>
            <p className="text-2xl font-bold text-lime-400 mb-2">{getGoalText(data.goal)}</p>
            <p className="text-gray-400 text-sm">Plano personalizado para atingir seus objetivos</p>
          </div>

          {/* Tipo de Corpo */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-lime-500" />
              <h3 className="text-lg font-semibold">Tipo de Corpo</h3>
            </div>
            <p className="text-2xl font-bold text-lime-400 mb-2">{getBodyTypeText(data.bodyType)}</p>
            <p className="text-gray-400 text-sm">Exercícios adaptados ao seu biotipo</p>
          </div>
        </div>

        {/* Data Prevista */}
        {data.timeToGoal && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Calendar className="h-6 w-6 text-lime-500" />
              <h2 className="text-xl font-semibold">Data Prevista para seu Objetivo</h2>
            </div>
            <div className="text-center space-y-3">
              <p className="text-4xl sm:text-5xl font-bold text-lime-400">{data.timeToGoal}</p>
              <p className="text-gray-400">Seguindo nosso plano personalizado, você atingirá seu objetivo nesta data</p>
            </div>
          </div>
        )}

        {/* Próximos Passos - Card Verde */}
        <div className="bg-lime-500 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">Próximos Passos</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-white mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-white text-lg mb-1">Plano de Treino Personalizado</h3>
                <p className="text-white/90">Exercícios específicos para seu tipo de corpo e objetivos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-white mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-white text-lg mb-1">Orientações Nutricionais</h3>
                <p className="text-white/90">Dicas de alimentação baseadas no seu IMC e metas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-white mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-white text-lg mb-1">Acompanhamento de Progresso</h3>
                <p className="text-white/90">Monitore sua evolução e ajuste seu plano conforme necessário</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            onClick={handleGoToCheckout}
            className="flex-1 bg-lime-500 hover:bg-lime-600 text-white font-semibold py-6 text-lg rounded-xl"
          >
            Escolher Plano e Finalizar
          </Button>
          <Button
            onClick={() => router.push("/dashboard/assinatura")}
            variant="outline"
            className="flex-1 border-lime-500 text-lime-500 hover:bg-lime-500 hover:text-white font-semibold py-6 text-lg rounded-xl"
          >
            Acessar Dashboard
          </Button>
        </div>

        <div className="text-center pt-4">
          <button onClick={() => router.push("/quiz")} className="text-gray-400 hover:text-lime-400 underline text-sm">
            Refazer Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
