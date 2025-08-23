"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, User, Target, Activity } from "lucide-react"

interface QuizData {
  gender: string
  name: string
  bodyType: string
  goal: string[]
  currentWeight: string
  targetWeight: string
  timeToGoal: string
  workoutTime: string
  experience: string
}

export default function ProgressoPage() {
  const router = useRouter()
  const [quizData, setQuizData] = useState<QuizData | null>(null)

  useEffect(() => {
    const savedQuizData = localStorage.getItem("quizData")
    if (savedQuizData) {
      setQuizData(JSON.parse(savedQuizData))
    }
  }, [])

  const getBodyAnalysis = () => {
    if (!quizData) return null

    const isWoman = quizData.gender === "mulher"
    const bodyType = quizData.bodyType
    const goals = quizData.goal || []

    return {
      bodyType: {
        name: bodyType === "ectomorfo" ? "Ectomorfo" : bodyType === "mesomorfo" ? "Mesomorfo" : "Endomorfo",
        description:
          bodyType === "ectomorfo"
            ? "Corpo naturalmente magro, metabolismo acelerado, dificuldade para ganhar peso"
            : bodyType === "mesomorfo"
              ? "Corpo atlético natural, facilidade para ganhar músculo e perder gordura"
              : "Tendência a acumular gordura, metabolismo mais lento, facilidade para ganhar peso",
        characteristics:
          bodyType === "ectomorfo"
            ? ["Ombros estreitos", "Metabolismo rápido", "Pouca gordura corporal", "Músculos longos"]
            : bodyType === "mesomorfo"
              ? ["Ombros largos", "Cintura fina", "Músculos bem definidos", "Metabolismo eficiente"]
              : ["Quadris largos", "Tendência ao acúmulo de gordura", "Músculos arredondados", "Metabolismo lento"],
      },
      recommendations: {
        diet:
          bodyType === "ectomorfo"
            ? "Dieta hipercalórica com carboidratos complexos e proteínas de qualidade"
            : bodyType === "mesomorfo"
              ? "Dieta balanceada com controle de porções e timing nutricional"
              : "Dieta hipocalórica com foco em proteínas e redução de carboidratos",
        training:
          bodyType === "ectomorfo"
            ? "Treinos intensos e curtos, foco em exercícios compostos"
            : bodyType === "mesomorfo"
              ? "Combinação de treino de força e cardio moderado"
              : "Cardio frequente combinado com treino de resistência",
        supplements:
          bodyType === "ectomorfo"
            ? ["Whey Protein", "Creatina", "Hipercalórico", "BCAA"]
            : bodyType === "mesomorfo"
              ? ["Whey Protein", "Creatina", "Multivitamínico"]
              : ["Whey Protein", "L-Carnitina", "Termogênico", "Ômega 3"],
      },
      metrics: {
        metabolismRate: bodyType === "ectomorfo" ? 85 : bodyType === "mesomorfo" ? 70 : 45,
        muscleGainPotential: bodyType === "ectomorfo" ? 60 : bodyType === "mesomorfo" ? 90 : 65,
        fatLossPotential: bodyType === "ectomorfo" ? 90 : bodyType === "mesomorfo" ? 80 : 55,
        recoveryRate: bodyType === "ectomorfo" ? 75 : bodyType === "mesomorfo" ? 85 : 60,
      },
    }
  }

  const analysis = getBodyAnalysis()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Análise Corporal Completa</h1>
            <p className="text-gray-600">Entenda seu biotipo e otimize seus resultados</p>
          </div>
        </div>

        {analysis && (
          <div className="space-y-8">
            {/* Body Type Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-blue-500" />
                  <span>Seu Biotipo: {analysis.bodyType.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">{analysis.bodyType.description}</p>

                <div>
                  <h4 className="font-medium mb-2">Características Principais:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {analysis.bodyType.characteristics.map((char, index) => (
                      <Badge key={index} variant="outline" className="justify-start">
                        {char}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span>Métricas Corporais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Taxa Metabólica</span>
                      <span className="text-sm text-gray-600">{analysis.metrics.metabolismRate}%</span>
                    </div>
                    <Progress value={analysis.metrics.metabolismRate} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Potencial de Ganho Muscular</span>
                      <span className="text-sm text-gray-600">{analysis.metrics.muscleGainPotential}%</span>
                    </div>
                    <Progress value={analysis.metrics.muscleGainPotential} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Potencial de Perda de Gordura</span>
                      <span className="text-sm text-gray-600">{analysis.metrics.fatLossPotential}%</span>
                    </div>
                    <Progress value={analysis.metrics.fatLossPotential} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Taxa de Recuperação</span>
                      <span className="text-sm text-gray-600">{analysis.metrics.recoveryRate}%</span>
                    </div>
                    <Progress value={analysis.metrics.recoveryRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🍽️ Dieta Recomendada</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{analysis.recommendations.diet}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💪 Treino Ideal</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{analysis.recommendations.training}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">💊 Suplementos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.recommendations.supplements.map((supplement, index) => (
                      <Badge key={index} variant="secondary" className="block text-center">
                        {supplement}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Plan */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Plano de Ação Personalizado</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Primeiras 4 Semanas</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Estabelecer rotina de treinos</li>
                        <li>• Ajustar dieta ao biotipo</li>
                        <li>• Monitorar progresso</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Próximos 2 Meses</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Intensificar treinos</li>
                        <li>• Ajustar macronutrientes</li>
                        <li>• Incluir suplementação</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
