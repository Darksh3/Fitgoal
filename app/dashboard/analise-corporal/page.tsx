"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, deleteDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Upload,
  Camera,
  Eye,
  Sparkles,
  TrendingUp,
  Settings,
  CheckCircle,
  Trash2,
  History,
} from "lucide-react"

import IzaChat from "@/components/iza-chat"

interface ProgressPhoto {
  id: string
  createdAt: string
  photoType: "front" | "back" | "side"
  photoUrl: string
  analysis?: {
    pontosForts: string[]
    areasParaMelhorar: string[]
    dicasEspecificas: string[]
    motivacao: string
    focoPrincipal: string
    progressoGeral: string
    recomendacoesTreino: string[]
    recomendacoesDieta: string[]
    otimizacaoNecessaria?: boolean
    otimizacoesSugeridas?: {
      dieta: {
        necessaria: boolean
        mudancas: string[]
        justificativa: string
      }
      treino: {
        necessaria: boolean
        mudancas: string[]
        justificativa: string
      }
    }
  }
  comparison?: {
    evolucaoGeral: string
    melhorias: string[]
    motivacao: string
    notaProgresso: string
    tempoDecorrido: string
  }
}

export default function AnaliseCorporalPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user] = useAuthState(auth)
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [selectedPhotoType, setSelectedPhotoType] = useState<"front" | "back" | "side">("front")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isComparing, setIsComparing] = useState(false)
  const [quizData, setQuizData] = useState<any>(null)
  const [isApplyingOptimization, setIsApplyingOptimization] = useState<string | null>(null)
  const [optimizationSuccess, setOptimizationSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("upload")

  const [dietOptimizationSuccess, setDietOptimizationSuccess] = useState<string | null>(null)
  const [workoutOptimizationSuccess, setWorkoutOptimizationSuccess] = useState<string | null>(null)
  const [isApplyingDiet, setIsApplyingDiet] = useState<string | null>(null)
  const [isApplyingWorkout, setIsApplyingWorkout] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const loadQuizData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setQuizData(userDoc.data().quizData || {})
        }
      } catch (error) {
        console.error("Error loading quiz data:", error)
      }
    }

    loadQuizData()

    const photosQuery = query(
      collection(db, "progressPhotos"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    )

    const unsubscribe = onSnapshot(photosQuery, (snapshot) => {
      const photosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProgressPhoto[]
      setPhotos(photosData)
    })

    return () => unsubscribe()
  }, [user])

  const handleApplyOptimization = async (photoId: string, optimizations: any) => {
    if (!user) return

    setIsApplyingOptimization(photoId)
    try {
      const response = await fetch("/api/apply-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          optimizations,
          photoId,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setOptimizationSuccess(photoId)
        setTimeout(() => setOptimizationSuccess(null), 3000)
      }
    } catch (error) {
      console.error("Error applying optimization:", error)
    } finally {
      setIsApplyingOptimization(null)
    }
  }

  const handleApplyDietOptimization = async (photoId: string, dietOptimization: any) => {
    if (!user || !dietOptimization) return

    setIsApplyingDiet(photoId)
    try {
      const response = await fetch("/api/apply-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          optimizations: {
            dieta: dietOptimization,
            treino: { necessaria: false, mudancas: [], justificativa: "" },
          },
          photoId,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setDietOptimizationSuccess(photoId)
        setTimeout(() => setDietOptimizationSuccess(null), 3000)
      }
    } catch (error) {
      console.error("Error applying diet optimization:", error)
    } finally {
      setIsApplyingDiet(null)
    }
  }

  const handleApplyWorkoutOptimization = async (photoId: string, workoutOptimization: any) => {
    if (!user || !workoutOptimization) return

    setIsApplyingWorkout(photoId)
    try {
      const response = await fetch("/api/apply-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          optimizations: {
            dieta: { necessaria: false, mudancas: [], justificativa: "" },
            treino: workoutOptimization,
          },
          photoId,
        }),
      })

      const result = await response.json()
      if (result.success) {
        setWorkoutOptimizationSuccess(photoId)
        setTimeout(() => setWorkoutOptimizationSuccess(null), 3000)
      }
    } catch (error) {
      console.error("Error applying workout optimization:", error)
    } finally {
      setIsApplyingWorkout(null)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    console.log("[v0] Starting photo upload and analysis")
    setIsAnalyzing(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log("[v0] Uploading photo...")
      const uploadResponse = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      })

      const { photoUrl } = await uploadResponse.json()
      console.log("[v0] Photo uploaded, URL:", photoUrl)

      console.log("[v0] Starting analysis with data:", {
        photoUrl,
        photoType: selectedPhotoType,
        userId: user.uid,
        userQuizData: quizData,
      })

      const analysisResponse = await fetch("/api/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl,
          photoType: selectedPhotoType,
          userId: user.uid,
          userQuizData: quizData,
        }),
      })

      const analysisResult = await analysisResponse.json()
      console.log("[v0] Analysis result:", analysisResult)

      if (analysisResult.success) {
        console.log("[v0] Dispatching photoAnalysisComplete event with:", analysisResult.analysis)
        const analysisEvent = new CustomEvent("photoAnalysisComplete", {
          detail: analysisResult.analysis,
        })
        window.dispatchEvent(analysisEvent)

        setIsComparing(true)
        const comparisonResponse = await fetch("/api/compare-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            currentPhotoUrl: photoUrl,
            photoType: selectedPhotoType,
          }),
        })

        const comparisonResult = await comparisonResponse.json()
        console.log("[v0] Comparison result:", comparisonResult)
      } else {
        console.log("[v0] Analysis failed:", analysisResult)
      }
    } catch (error) {
      console.error("[v0] Error uploading and analyzing photo:", error)
    } finally {
      setIsAnalyzing(false)
      setIsComparing(false)
    }
  }

  const generateAIAnalysis = (type: string) => {
    const analyses = {
      front: [
        "Excelente simetria muscular! Progresso notável nos músculos do peitoral e abdômen.",
        "Boa definição muscular. Continue focando no treino de core para melhores resultados.",
        "Postura melhorou significativamente. Músculos dos ombros mais desenvolvidos.",
      ],
      back: [
        "Desenvolvimento impressionante dos músculos das costas. Latíssimo bem definido.",
        "Boa progressão na musculatura posterior. Continue com exercícios de puxada.",
        "Postura das costas excelente. Músculos trapézio bem desenvolvidos.",
      ],
      side: [
        "Redução visível de gordura abdominal. Perfil corporal mais atlético.",
        "Boa definição lateral do core. Continue com exercícios funcionais.",
        "Progresso notável na região do oblíquo. Cintura mais definida.",
      ],
    }

    const typeAnalyses = analyses[type as keyof typeof analyses]
    return typeAnalyses[Math.floor(Math.random() * typeAnalyses.length)]
  }

  const deletePhoto = async (id: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, "progressPhotos", id))
      console.log("[v0] Photo deleted successfully:", id)
    } catch (error) {
      console.error("[v0] Error deleting photo:", error)
    }
  }

  const getPhotoTypeLabel = (type: string) => {
    const labels = { front: "Frente", back: "Costas", side: "Lateral" }
    return labels[type as keyof typeof labels]
  }

  const getPhotoTypeColor = (type: string) => {
    const colors = {
      front: "bg-blue-100 text-blue-800",
      back: "bg-green-100 text-green-800",
      side: "bg-purple-100 text-purple-800",
    }
    return colors[type as keyof typeof colors]
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Progresso Fotográfico</h1>
            <p className="text-gray-600">Acompanhe sua evolução com análise de IA avançada</p>
          </div>
        </div>

        {/* Tabs for Upload and History */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Nova Foto
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico ({photos.length})
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {/* Upload Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5 text-blue-600" />
                  <span>Adicionar Nova Foto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-3">Selecione o tipo de foto:</p>
                  <div className="flex space-x-3">
                    {[
                      { key: "front", label: "Frente" },
                      { key: "back", label: "Costas" },
                      { key: "side", label: "Lateral" },
                    ].map((type) => (
                      <Button
                        key={type.key}
                        variant={selectedPhotoType === type.key ? "default" : "outline"}
                        onClick={() => setSelectedPhotoType(type.key as "front" | "back" | "side")}
                        className="flex-1"
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button onClick={() => fileInputRef.current?.click()} className="flex-1" disabled={isAnalyzing}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isAnalyzing ? "Analisando..." : "Escolher Foto"}
                  </Button>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

                <div className="p-4 bg-blue-100 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">📸 Dicas para melhores fotos:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Use boa iluminação natural</li>
                    <li>• Mantenha a mesma distância da câmera</li>
                    <li>• Use roupas justas ou mínimas</li>
                    <li>• Tire fotos no mesmo horário do dia</li>
                    <li>• Mantenha a mesma pose</li>
                    <li>• Tire fotos a cada 2-4 semanas para melhor comparação</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Status */}
            {(isAnalyzing || isComparing) && (
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <p className="font-medium text-purple-800">
                        {isAnalyzing && "IA analisando sua foto..."}
                        {isComparing && "Comparando com fotos anteriores..."}
                      </p>
                      <p className="text-sm text-purple-600">Isso pode levar alguns segundos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {photos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Últimas Análises</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {photos.slice(0, 3).map((photo) => (
                    <Card key={photo.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={photo.photoUrl || "/placeholder.svg"}
                            alt={`Foto ${getPhotoTypeLabel(photo.photoType)}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge className={getPhotoTypeColor(photo.photoType)}>
                            {getPhotoTypeLabel(photo.photoType)}
                          </Badge>
                          <p className="text-xs text-gray-600">
                            {new Date(photo.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        {photo.analysis && (
                          <p className="text-xs text-gray-700 line-clamp-2">{photo.analysis.motivacao}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 bg-transparent"
                  onClick={() => setActiveTab("history")}
                >
                  Ver Histórico Completo
                </Button>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            {photos.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-800 mb-2">Nenhuma foto ainda</h3>
                  <p className="text-gray-600 mb-6">
                    Comece adicionando suas primeiras fotos de progresso para acompanhar sua evolução com IA
                  </p>
                  <Button onClick={() => setActiveTab("upload")}>
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Primeira Foto
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo) => (
                  <Card key={photo.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getPhotoTypeColor(photo.photoType)}>
                          {getPhotoTypeLabel(photo.photoType)}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => window.open(photo.photoUrl, "_blank")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir esta foto?")) {
                                deletePhoto(photo.id)
                              }
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={photo.photoUrl || "/placeholder.svg"}
                          alt={`Foto ${getPhotoTypeLabel(photo.photoType)}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          {new Date(photo.createdAt).toLocaleDateString("pt-BR")}
                        </p>

                        {photo.analysis ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <Sparkles className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="space-y-2 w-full">
                                  <p className="text-sm font-medium text-green-800">Análise Completa da IA:</p>

                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <p className="font-medium text-green-800 mb-1">Motivação:</p>
                                      <p className="text-green-700">{photo.analysis.motivacao}</p>
                                    </div>

                                    <div>
                                      <p className="font-medium text-green-800 mb-1">Pontos Fortes:</p>
                                      <ul className="list-disc list-inside ml-2 text-green-700 space-y-0.5">
                                        {photo.analysis.pontosForts.map((ponto, i) => (
                                          <li key={i}>{ponto}</li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div>
                                      <p className="font-medium text-green-800 mb-1">Áreas para Melhorar:</p>
                                      <ul className="list-disc list-inside ml-2 text-green-700 space-y-0.5">
                                        {photo.analysis.areasParaMelhorar.map((area, i) => (
                                          <li key={i}>{area}</li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div>
                                      <p className="font-medium text-green-800 mb-1">Dicas Específicas:</p>
                                      <ul className="list-disc list-inside ml-2 text-green-700 space-y-0.5">
                                        {photo.analysis.dicasEspecificas.map((dica, i) => (
                                          <li key={i}>{dica}</li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div>
                                      <p className="font-medium text-green-800">Foco Principal:</p>
                                      <p className="text-green-700">{photo.analysis.focoPrincipal}</p>
                                    </div>

                                    <div>
                                      <p className="font-medium text-green-800">Progresso Geral:</p>
                                      <p className="text-green-700">{photo.analysis.progressoGeral}</p>
                                    </div>

                                    {photo.analysis.recomendacoesTreino.length > 0 && (
                                      <div>
                                        <p className="font-medium text-green-800 mb-1">Recomendações de Treino:</p>
                                        <ul className="list-disc list-inside ml-2 text-green-700 space-y-0.5">
                                          {photo.analysis.recomendacoesTreino.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {photo.analysis.recomendacoesDieta.length > 0 && (
                                      <div>
                                        <p className="font-medium text-green-800 mb-1">Recomendações de Dieta:</p>
                                        <ul className="list-disc list-inside ml-2 text-green-700 space-y-0.5">
                                          {photo.analysis.recomendacoesDieta.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {photo.analysis.otimizacaoNecessaria && photo.analysis.otimizacoesSugeridas && (
                              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <Settings className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                  <div className="space-y-2 flex-1">
                                    <p className="text-sm font-medium text-orange-800">Otimizações Sugeridas:</p>

                                    {photo.analysis.otimizacoesSugeridas.dieta.necessaria && (
                                      <div className="text-xs space-y-2 p-2 bg-white rounded border border-orange-100">
                                        <span className="font-medium text-orange-700 block">Dieta:</span>
                                        <ul className="list-disc list-inside ml-2 text-orange-600 space-y-0.5">
                                          {photo.analysis.otimizacoesSugeridas.dieta.mudancas.map((mudanca, i) => (
                                            <li key={i}>{mudanca}</li>
                                          ))}
                                        </ul>
                                        <p className="text-xs text-orange-600 italic">
                                          {photo.analysis.otimizacoesSugeridas.dieta.justificativa}
                                        </p>

                                        {dietOptimizationSuccess === photo.id ? (
                                          <div className="flex items-center text-green-600 text-xs mt-2">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Alterações aplicadas na dieta!
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleApplyDietOptimization(
                                                photo.id,
                                                photo.analysis?.otimizacoesSugeridas?.dieta,
                                              )
                                            }
                                            disabled={isApplyingDiet === photo.id}
                                            className="text-xs h-7 px-3 bg-orange-600 hover:bg-orange-700 mt-2 w-full"
                                          >
                                            {isApplyingDiet === photo.id ? (
                                              "Aplicando..."
                                            ) : (
                                              <>
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Aderir alterações na minha dieta
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    {photo.analysis.otimizacoesSugeridas.treino.necessaria && (
                                      <div className="text-xs space-y-2 p-2 bg-white rounded border border-orange-100">
                                        <span className="font-medium text-orange-700 block">Treino:</span>
                                        <ul className="list-disc list-inside ml-2 text-orange-600 space-y-0.5">
                                          {photo.analysis.otimizacoesSugeridas.treino.mudancas.map((mudanca, i) => (
                                            <li key={i}>{mudanca}</li>
                                          ))}
                                        </ul>
                                        <p className="text-xs text-orange-600 italic">
                                          {photo.analysis.otimizacoesSugeridas.treino.justificativa}
                                        </p>

                                        {workoutOptimizationSuccess === photo.id ? (
                                          <div className="flex items-center text-green-600 text-xs mt-2">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Alterações aplicadas no treino!
                                          </div>
                                        ) : (
                                          <Button
                                            size="sm"
                                            onClick={() =>
                                              handleApplyWorkoutOptimization(
                                                photo.id,
                                                photo.analysis?.otimizacoesSugeridas?.treino,
                                              )
                                            }
                                            disabled={isApplyingWorkout === photo.id}
                                            className="text-xs h-7 px-3 bg-orange-600 hover:bg-orange-700 mt-2 w-full"
                                          >
                                            {isApplyingWorkout === photo.id ? (
                                              "Aplicando..."
                                            ) : (
                                              <>
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Aderir alterações no meu treino
                                              </>
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {photo.comparison && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium text-blue-800">Evolução:</p>
                                    <p className="text-sm text-blue-700">{photo.comparison.motivacao}</p>
                                    <div className="text-xs">
                                      <span className="font-medium">Nota: {photo.comparison.notaProgresso}/10</span>
                                      <span className="ml-2">({photo.comparison.tempoDecorrido})</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-600">Aguardando análise...</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <IzaChat />
    </div>
  )
}
