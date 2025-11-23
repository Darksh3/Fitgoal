"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Target, Calendar, Dumbbell, Heart, TrendingUp } from "lucide-react"

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // Busca primeiro localStorage, depois Firebase
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

  const getIMCColor = (imc: number) => {
    if (imc < 18.5) return "text-blue-400"
    if (imc >= 18.5 && imc < 25) return "text-lime-400"
    if (imc >= 25 && imc < 30) return "text-yellow-400"
    return "text-red-400"
  }

  const handleGoToCheckout = () => {
    if (!data) return
    router.push("/checkout")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 mx-auto mb-4"></div>
          <p>Carregando seus resultados...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gray-900">
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
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Parabéns, <span className="text-lime-400">{data.name}</span>!
          </h1>
          <p className="text-gray-300">Seu plano personalizado está pronto</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center text-white text-xl">
              <Heart className="h-6 w-6 text-lime-500 mr-2" />
              Análise do seu IMC
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-5xl md:text-6xl font-bold">
              <span className={getIMCColor(Number(data.imc))}>{data.imc}</span>
            </div>
            <p className="text-lg text-gray-300">
              Calculamos o seu IMC e ele é de <span className="text-lime-400 font-bold">{data.imc}</span>
            </p>
            <p className="text-xl">
              Você está <span className="text-lime-400 font-bold">{data.imcClassification || "em análise"}</span>
            </p>
            <div className="bg-gray-700 rounded-lg p-4 mt-4">
              <p className="text-gray-300">{data.status}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Target className="h-6 w-6 text-lime-500 mr-2" />
                Seu Objetivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-lime-400">{getGoalText(data.goal)}</p>
              <p className="text-gray-300 mt-2">Plano personalizado para atingir seus objetivos</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Dumbbell className="h-6 w-6 text-lime-500 mr-2" />
                Tipo de Corpo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-lime-400">{getBodyTypeText(data.bodyType)}</p>
              <p className="text-gray-300 mt-2">Exercícios adaptados ao seu biotipo</p>
            </CardContent>
          </Card>
        </div>

        {data.timeToGoal && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Calendar className="h-6 w-6 text-lime-500 mr-2" />
                Data Prevista para seu Objetivo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-3xl font-bold text-lime-400 mb-2">{data.timeToGoal}</p>
              <p className="text-gray-300">Seguindo nosso plano personalizado, você atingirá seu objetivo nesta data</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-r from-lime-500 to-lime-600 border-0">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <TrendingUp className="h-6 w-6 mr-2" />
              Próximos Passos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-white mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-white">Plano de Treino Personalizado</h3>
                  <p className="text-white/90">Exercícios específicos para seu tipo de corpo e objetivos</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-white mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-white">Orientações Nutricionais</h3>
                  <p className="text-white/90">Dicas de alimentação baseadas no seu IMC e metas</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-white mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-white">Acompanhamento de Progresso</h3>
                  <p className="text-white/90">Monitore sua evolução e ajuste seu plano conforme necessário</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row gap-4 justify-center pt-6">
          <button className="btn-neon-outline" onClick={handleGoToCheckout}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="font-semibold text-lg">Escolher Plano e Finalizar</span>
          </button>
          <button className="btn-neon-outline" onClick={() => router.push("/dashboard/assinatura")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span className="font-semibold text-lg">Acessar Dashboard</span>
          </button>
          <button className="btn-neon-outline" onClick={() => router.push("/quiz")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-semibold text-lg">Refazer Quiz</span>
          </button>
        </div>
      </div>
    </div>
  )
}
