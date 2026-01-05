"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Target, Calendar, Dumbbell, Heart, CreditCard } from "lucide-react"

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
            <div className="text-6xl font-bold">
              <span className={getIMCColor(Number(data.imc))}>{data.imc}</span>
            </div>
            <p className="text-lg text-gray-300">
              Calculamos o seu IMC e ele é de <span className="text-lime-400 font-bold">{data.imc}</span>
            </p>
            <p className="text-xl">
              Você está <span className="text-lime-400 font-bold">{data.classification}</span>
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

        <div className="relative rounded-3xl overflow-hidden border-2 border-lime-500/50">
          {/* Glow effect background */}
          <div className="absolute inset-0 bg-gradient-to-b from-lime-500 via-lime-600 to-lime-700 opacity-90"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-lime-400 via-lime-500 to-amber-500 opacity-30 blur-2xl -z-10"></div>

          <div className="relative p-8 md:p-12 space-y-8">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">O que você recebe:</h2>
            </div>

            {/* Benefits List */}
            <div className="space-y-6">
              {/* Benefit 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Dieta 100% personalizada em você</h3>
                  <p className="text-white/80 text-sm mt-1">
                    Plano de dieta claro, personalizado para o seu corpo e objetivo
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Programa de treino personalizado</h3>
                  <p className="text-white/80 text-sm mt-1">Treino customizado para seu nível e objetivo</p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Método de resultados acelerados</h3>
                  <p className="text-white/80 text-sm mt-1">
                    Primeiros 30 dias de progressos rápidos com nosso método comprovado
                  </p>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Acompanhamento de progresso</h3>
                  <p className="text-white/80 text-sm mt-1">Sistema de monitoramento e ajustes semanais</p>
                </div>
              </div>
            </div>

            {/* Special Condition Footer */}
            <div className="border-t-2 border-white/20 pt-6 space-y-3 text-center">
              <p className="text-amber-200 text-xl font-bold">Você receberá uma condição MEGA ESPECIAL</p>
              <p className="text-white/90 text-sm">
                Aproveitaremos a oportunidade de hoje para oferecer benefícios exclusivos para você
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-center pt-6">
          <Button
            className="bg-lime-500 hover:bg-lime-600 text-white py-6 px-8 text-lg rounded-full"
            onClick={handleGoToCheckout}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Escolher Plano e Finalizar
          </Button>
          <Button
            className="bg-gray-700 hover:bg-gray-600 text-white py-6 px-8 text-lg rounded-full"
            onClick={() => router.push("/dashboard/assinatura")}
          >
            <Calendar className="h-5 w-5 mr-2" />
            Acessar Dashboard
          </Button>
          <Button
            variant="outline"
            className="border-2 border-lime-500 text-lime-500 hover:bg-lime-500 hover:text-white py-6 px-8 text-lg rounded-full bg-gray-800"
            onClick={() => router.push("/quiz")}
          >
            Refazer Quiz
          </Button>
        </div>
      </div>
    </div>
  )
}
