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
  Sparkles,
  Settings,
  CheckCircle,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"

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

interface PendingPhoto {
  file: File
  preview: string
  type: "front" | "back" | "side"
}

export default function AnaliseCorporalPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user] = useAuthState(auth)
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])

  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
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

  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null)
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null)

  const handleDeletePhoto = async (id: string) => {
    if (!user) return

    try {
      await deleteDoc(doc(db, "progressPhotos", id))
      console.log("[v0] Photo deleted successfully:", id)
    } catch (error) {
      console.error("[v0] Error deleting photo:", error)
    }
  }

  // Function to load history data
  const loadHistory = async () => {
    if (!user) return

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
  }

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
    const unsubscribeHistory = loadHistory()

    return () => {
      if (unsubscribeHistory) {
        // Ensure unsubscribeHistory is a function before calling it
        const unsubscribeFn = unsubscribeHistory
        if (typeof unsubscribeFn === "function") {
          unsubscribeFn()
        }
      }
    }
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Check if this photo type already exists in pending
    const existingIndex = pendingPhotos.findIndex((p) => p.type === selectedPhotoType)

    const preview = URL.createObjectURL(file)
    const newPhoto: PendingPhoto = {
      file,
      preview,
      type: selectedPhotoType,
    }

    if (existingIndex >= 0) {
      // Replace existing photo of same type
      const updated = [...pendingPhotos]
      URL.revokeObjectURL(updated[existingIndex].preview)
      updated[existingIndex] = newPhoto
      setPendingPhotos(updated)
    } else {
      // Add new photo
      setPendingPhotos([...pendingPhotos, newPhoto])
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemovePendingPhoto = (type: "front" | "back" | "side") => {
    const photo = pendingPhotos.find((p) => p.type === type)
    if (photo) {
      URL.revokeObjectURL(photo.preview)
    }
    setPendingPhotos(pendingPhotos.filter((p) => p.type !== type))
  }

  const handleAnalyzePhotos = async () => {
    if (!user || pendingPhotos.length === 0) return

    setIsAnalyzing(true)
    setCurrentAnalysis(null)

    try {
      console.log("[v0] Starting photo upload and analysis process")

      const uploadedPhotos = await Promise.all(
        pendingPhotos.map(async (photo) => {
          const formData = new FormData()
          formData.append("file", photo.file)

          console.log("[v0] Uploading photo:", photo.type)
          const uploadResponse = await fetch("/api/upload-photo", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${photo.type} photo`)
          }

          const uploadData = await uploadResponse.json()
          console.log("[v0] Photo uploaded successfully:", uploadData.photoUrl)

          return {
            photoUrl: uploadData.photoUrl,
            photoType: photo.type,
          }
        }),
      )

      console.log("[v0] All photos uploaded, starting AI analysis")

      const analysisResponse = await fetch("/api/analyze-photos-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: uploadedPhotos,
          userId: user.uid,
          userQuizData: quizData,
        }),
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json()
        console.error("[v0] Analysis API error:", errorData)
        throw new Error(errorData.details || errorData.error || "Failed to analyze photos")
      }

      const analysisData = await analysisResponse.json()
      console.log("[v0] Analysis completed successfully")
      console.log("[v0] Real diet totals used:", analysisData.realDietTotals)

      setCurrentAnalysis(analysisData.analysis)
      pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview))
      setPendingPhotos([])

      await loadHistory()
      setActiveTab("history")

      alert("Análise profissional concluída! Verifique o histórico para ver os resultados detalhados.")
    } catch (error) {
      console.error("[v0] Error in analysis process:", error)
      alert(error instanceof Error ? error.message : "Erro ao analisar fotos. Tente novamente.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    console.log("[v0] Starting photo upload and analysis")
    setIsAnalyzing(true)
    setCurrentAnalysis(null)

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
        setCurrentAnalysis({
          ...analysisResult.analysis,
          photoUrl,
          photoType: selectedPhotoType,
          createdAt: new Date().toISOString(),
        })

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
      console.error("[v0] Error during photo upload/analysis:", error)
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
            <h1 className="text-3xl font-bold text-gray-800">Análise Corporal Profissional</h1>
            <p className="text-gray-600">Receba feedback técnico de personal trainer e nutricionista especializado</p>
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
                  <span>Adicionar Fotos para Análise</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Adicione 2 ou 3 fotos (frente, costas e/ou lateral) e envie todas juntas para análise completa
                </p>
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

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  disabled={isAnalyzing}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar Foto {getPhotoTypeLabel(selectedPhotoType)}
                </Button>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                {pendingPhotos.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Fotos adicionadas ({pendingPhotos.length}):</p>
                    <div className="grid grid-cols-3 gap-3">
                      {pendingPhotos.map((photo) => (
                        <div key={photo.type} className="relative">
                          <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={photo.preview || "/placeholder.svg"}
                              alt={getPhotoTypeLabel(photo.type)}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Badge className={`absolute top-2 left-2 ${getPhotoTypeColor(photo.type)}`}>
                            {getPhotoTypeLabel(photo.type)}
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => handleRemovePendingPhoto(photo.type)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleAnalyzePhotos}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={isAnalyzing}
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Enviar para Análise Profissional
                        </>
                      )}
                    </Button>
                  </div>
                )}

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

            {currentAnalysis && !isAnalyzing && !isComparing && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader
                  className="cursor-pointer hover:bg-green-100/50 transition-colors"
                  onClick={() => setExpandedAnalysis(expandedAnalysis === "current" ? null : "current")}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-green-600" />
                      <span>Resultado da sua Análise</span>
                    </CardTitle>
                    {expandedAnalysis === "current" ? (
                      <ChevronUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique para {expandedAnalysis === "current" ? "ocultar" : "ver"} a análise completa
                  </p>
                </CardHeader>

                {expandedAnalysis === "current" && (
                  <CardContent className="space-y-6 pt-4">
                    {/* Photo Preview */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-40 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={currentAnalysis.photoUrl || "/placeholder.svg"}
                          alt="Foto analisada"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <Badge className={getPhotoTypeColor(currentAnalysis.photoType)}>
                          {getPhotoTypeLabel(currentAnalysis.photoType)}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-2">
                          {new Date(currentAnalysis.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Analysis Content */}
                    {currentAnalysis.motivacao && (
                      <div className="p-4 bg-white rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Motivação
                        </h4>
                        <p className="text-gray-700">{currentAnalysis.motivacao}</p>
                      </div>
                    )}

                    {currentAnalysis.pontosForts && currentAnalysis.pontosForts.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">✅ Pontos Fortes</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.pontosForts.map((ponto: string, idx: number) => (
                            <li key={idx} className="text-gray-700">
                              • {ponto}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.areasParaMelhorar && currentAnalysis.areasParaMelhorar.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-orange-200">
                        <h4 className="font-semibold text-orange-800 mb-2">⚠️ Áreas para Melhorar</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.areasParaMelhorar.map((area: string, idx: number) => (
                            <li key={idx} className="text-gray-700">
                              • {area}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.dicasEspecificas && currentAnalysis.dicasEspecificas.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">💡 Dicas Específicas</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.dicasEspecificas.map((dica: string, idx: number) => (
                            <li key={idx} className="text-gray-700">
                              • {dica}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.focoPrincipal && (
                      <div className="p-4 bg-white rounded-lg border border-purple-200">
                        <h4 className="font-semibold text-purple-800 mb-2">🎯 Foco Principal</h4>
                        <p className="text-gray-700">{currentAnalysis.focoPrincipal}</p>
                      </div>
                    )}

                    {currentAnalysis.progressoGeral && (
                      <div className="p-4 bg-white rounded-lg border border-indigo-200">
                        <h4 className="font-semibold text-indigo-800 mb-2">📊 Progresso Geral</h4>
                        <p className="text-gray-700">{currentAnalysis.progressoGeral}</p>
                      </div>
                    )}

                    {currentAnalysis.recomendacoesTreino && currentAnalysis.recomendacoesTreino.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-red-200">
                        <h4 className="font-semibold text-red-800 mb-2">🏋️ Recomendações de Treino</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.recomendacoesTreino.map((rec: string, idx: number) => (
                            <li key={idx} className="text-gray-700">
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.recomendacoesDieta && currentAnalysis.recomendacoesDieta.length > 0 && (
                      <div className="p-4 bg-white rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-2">🥗 Recomendações de Dieta</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.recomendacoesDieta.map((rec: string, idx: number) => (
                            <li key={idx} className="text-gray-700">
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optimization Buttons */}
                    {currentAnalysis.otimizacoesSugeridas && (
                      <div className="space-y-4 pt-4 border-t border-green-200">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Otimizações Sugeridas
                        </h4>

                        {currentAnalysis.otimizacoesSugeridas.dieta?.necessaria && (
                          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <h5 className="font-medium text-yellow-900 mb-2">🥗 Ajustes na Dieta</h5>
                            <p className="text-sm text-yellow-800 mb-2">
                              {currentAnalysis.otimizacoesSugeridas.dieta.justificativa}
                            </p>
                            <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                              {currentAnalysis.otimizacoesSugeridas.dieta.mudancas.map(
                                (mudanca: string, idx: number) => (
                                  <li key={idx}>• {mudanca}</li>
                                ),
                              )}
                            </ul>
                            <Button
                              onClick={() =>
                                handleApplyDietOptimization("current", currentAnalysis.otimizacoesSugeridas.dieta)
                              }
                              disabled={isApplyingDiet === "current"}
                              className="w-full bg-yellow-600 hover:bg-yellow-700"
                            >
                              {isApplyingDiet === "current" ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Aplicando...
                                </>
                              ) : dietOptimizationSuccess === "current" ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aplicado com Sucesso!
                                </>
                              ) : (
                                "Aderir Alterações na Minha Dieta"
                              )}
                            </Button>
                          </div>
                        )}

                        {currentAnalysis.otimizacoesSugeridas.treino?.necessaria && (
                          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <h5 className="font-medium text-red-900 mb-2">🏋️ Ajustes no Treino</h5>
                            <p className="text-sm text-red-800 mb-2">
                              {currentAnalysis.otimizacoesSugeridas.treino.justificativa}
                            </p>
                            <ul className="text-sm text-red-700 space-y-1 mb-3">
                              {currentAnalysis.otimizacoesSugeridas.treino.mudancas.map(
                                (mudanca: string, idx: number) => (
                                  <li key={idx}>• {mudanca}</li>
                                ),
                              )}
                            </ul>
                            <Button
                              onClick={() =>
                                handleApplyWorkoutOptimization("current", currentAnalysis.otimizacoesSugeridas.treino)
                              }
                              disabled={isApplyingWorkout === "current"}
                              className="w-full bg-red-600 hover:bg-red-700"
                            >
                              {isApplyingWorkout === "current" ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Aplicando...
                                </>
                              ) : workoutOptimizationSuccess === "current" ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Aplicado com Sucesso!
                                </>
                              ) : (
                                "Aderir Alterações no Meu Treino"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
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
              <Card>
                <CardContent className="p-12 text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma foto ainda</h3>
                  <p className="text-gray-600 mb-4">Comece enviando sua primeira foto para análise</p>
                  <Button onClick={() => setActiveTab("upload")}>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Primeira Foto
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {photos.map((photo) => (
                  <Card key={photo.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedAnalysis(expandedAnalysis === photo.id ? null : photo.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-24 bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={photo.photoUrl || "/placeholder.svg"}
                              alt={`Foto ${getPhotoTypeLabel(photo.photoType)}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getPhotoTypeColor(photo.photoType)}>
                                {getPhotoTypeLabel(photo.photoType)}
                              </Badge>
                              <p className="text-sm text-gray-600">
                                {new Date(photo.createdAt).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700">
                              Clique para {expandedAnalysis === photo.id ? "ocultar" : "ver"} análise completa
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePhoto(photo.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                          {expandedAnalysis === photo.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedAnalysis === photo.id && photo.analysis && (
                      <CardContent className="space-y-4 pt-4 border-t">
                        {/* Same analysis content structure as current analysis */}
                        {photo.analysis.motivacao && (
                          <div className="p-4 bg-green-50 rounded-lg">
                            <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              Motivação
                            </h4>
                            <p className="text-gray-700">{photo.analysis.motivacao}</p>
                          </div>
                        )}

                        {photo.analysis.pontosForts && photo.analysis.pontosForts.length > 0 && (
                          <div className="p-4 bg-white rounded-lg border">
                            <h4 className="font-semibold text-green-800 mb-2">✅ Pontos Fortes</h4>
                            <ul className="space-y-1">
                              {photo.analysis.pontosForts.map((ponto, idx) => (
                                <li key={idx} className="text-gray-700">
                                  • {ponto}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {photo.analysis.areasParaMelhorar && photo.analysis.areasParaMelhorar.length > 0 && (
                          <div className="p-4 bg-white rounded-lg border">
                            <h4 className="font-semibold text-orange-800 mb-2">⚠️ Áreas para Melhorar</h4>
                            <ul className="space-y-1">
                              {photo.analysis.areasParaMelhorar.map((area, idx) => (
                                <li key={idx} className="text-gray-700">
                                  • {area}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {photo.analysis.dicasEspecificas && photo.analysis.dicasEspecificas.length > 0 && (
                          <div className="p-4 bg-white rounded-lg border">
                            <h4 className="font-semibold text-blue-800 mb-2">💡 Dicas Específicas</h4>
                            <ul className="space-y-1">
                              {photo.analysis.dicasEspecificas.map((dica, idx) => (
                                <li key={idx} className="text-gray-700">
                                  • {dica}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {photo.analysis.recomendacoesTreino && photo.analysis.recomendacoesTreino.length > 0 && (
                          <div className="p-4 bg-white rounded-lg border">
                            <h4 className="font-semibold text-red-800 mb-2">🏋️ Recomendações de Treino</h4>
                            <ul className="space-y-1">
                              {photo.analysis.recomendacoesTreino.map((rec, idx) => (
                                <li key={idx} className="text-gray-700">
                                  • {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {photo.analysis.recomendacoesDieta && photo.analysis.recomendacoesDieta.length > 0 && (
                          <div className="p-4 bg-white rounded-lg border">
                            <h4 className="font-semibold text-yellow-800 mb-2">🥗 Recomendações de Dieta</h4>
                            <ul className="space-y-1">
                              {photo.analysis.recomendacoesDieta.map((rec, idx) => (
                                <li key={idx} className="text-gray-700">
                                  • {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Optimization buttons for history items */}
                        {photo.analysis.otimizacoesSugeridas && (
                          <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Otimizações Sugeridas
                            </h4>

                            {photo.analysis.otimizacoesSugeridas.dieta?.necessaria && (
                              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <h5 className="font-medium text-yellow-900 mb-2">🥗 Ajustes na Dieta</h5>
                                <p className="text-sm text-yellow-800 mb-2">
                                  {photo.analysis.otimizacoesSugeridas.dieta.justificativa}
                                </p>
                                <ul className="text-sm text-yellow-700 space-y-1 mb-3">
                                  {photo.analysis.otimizacoesSugeridas.dieta.mudancas.map((mudanca, idx) => (
                                    <li key={idx}>• {mudanca}</li>
                                  ))}
                                </ul>
                                <Button
                                  onClick={() =>
                                    handleApplyDietOptimization(photo.id, photo.analysis.otimizacoesSugeridas.dieta)
                                  }
                                  disabled={isApplyingDiet === photo.id}
                                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                                >
                                  {isApplyingDiet === photo.id ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                      Aplicando...
                                    </>
                                  ) : dietOptimizationSuccess === photo.id ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Aplicado com Sucesso!
                                    </>
                                  ) : (
                                    "Aderir Alterações na Minha Dieta"
                                  )}
                                </Button>
                              </div>
                            )}

                            {photo.analysis.otimizacoesSugeridas.treino?.necessaria && (
                              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <h5 className="font-medium text-red-900 mb-2">🏋️ Ajustes no Treino</h5>
                                <p className="text-sm text-red-800 mb-2">
                                  {photo.analysis.otimizacoesSugeridas.treino.justificativa}
                                </p>
                                <ul className="text-sm text-red-700 space-y-1 mb-3">
                                  {photo.analysis.otimizacoesSugeridas.treino.mudancas.map((mudanca, idx) => (
                                    <li key={idx}>• {mudanca}</li>
                                  ))}
                                </ul>
                                <Button
                                  onClick={() =>
                                    handleApplyWorkoutOptimization(photo.id, photo.analysis.otimizacoesSugeridas.treino)
                                  }
                                  disabled={isApplyingWorkout === photo.id}
                                  className="w-full bg-red-600 hover:bg-red-700"
                                >
                                  {isApplyingWorkout === photo.id ? (
                                    <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                      Aplicando...
                                    </>
                                  ) : workoutOptimizationSuccess === photo.id ? (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Aplicado com Sucesso!
                                    </>
                                  ) : (
                                    "Aderir Alterações no Meu Treino"
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
