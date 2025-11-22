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
import { Tabs, TabsContent } from "@/components/ui/tabs"
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
  userId: string
  photoUrl?: string
  photoType?: string
  photos?: Array<{
    photoUrl: string
    photoType: string
  }>
  analysis: {
    pontosForts?: string[] // Original property
    areasParaMelhorar?: string[] // Original property
    dicasEspecificas?: string[] // Original property
    motivacao?: string // Original property
    focoPrincipal?: string // Original property
    progressoGeral?: string // Original property
    recomendacoesTreino?: string[] // Original property
    recomendacoesDieta?: string[] // Original property
    otimizacaoNecessaria?: boolean // Original property
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
    // Updated properties
    resumoExecutivo?: string
    composicaoCorporal?: {
      percentualGorduraEstimado: string
      observacoes: string
      pontosFortes?: string[]
      pontosAtencao?: string[]
      massaMuscular?: string // New property
    }
    avaliacaoPorAngulo?: {
      frente: string
      costas: string
      lateral: string
    }
    desenvolvimentoMuscular?: {
      pontosFortes?: Array<{
        grupo: string
        descricao: string
        percentualDesenvolvimento?: string
      }>
      areasParaMelhorar?: Array<{
        grupo: string
        descricao: string
        recomendacao?: string
      }>
    }
    ajustesSugeridosTreino?: {
      oqueManter?: string[]
      oqueMudar?: Array<{
        mudanca: string
        razao?: string
        como?: string
      }>
    }
    ajustesSugeridosDieta?: {
      avaliacaoAtual?: string
      ajustesEspecificos?: Array<{
        ajuste: string
        quantidade?: string
        redistribuicao?: string
        razao?: string
      }>
      macrosAlvo?: {
        calorias?: string
        proteina?: string
        carboidratos?: string
        gorduras?: string
      }
    }
    progressao?: {
      statusAtual?: string
      proximosPassos?: string
      expectativas?: string
      motivacao?: string
    }
    // Original properties (kept for backward compatibility or if specific parts are still used)
    gruposMusculares?: string[]
    feedbackTreino?: {
      frequenciaSugerida?: string
      tiposExercicio?: string[]
      intensidade?: string
    }
    feedbackNutricional?: {
      hidratacao?: string
      ajustesCaloricos?: string
      recomendacoesMacros?: string
    }
    progressoObservacoes?: {
      melhorias?: string[]
      mensagemMotivacional?: string
    }
    // New properties for organized display
    pontosFortes?: string[]
    pontosAMelhorar?: string[]
    sobreTreino?: string
    sobreDieta?: string
    evolucaoComparada?: {
      diasDesdeUltimaAnalise: string
      resumo: string
      melhorias?: string[]
      retrocessos?: string[]
      avaliacaoRitmo?: string
    }
    dicas?: string[]
    ajustes?: {
      necessario: boolean
      treino?: {
        status: string
        sugestoes?: string[]
      }
      dieta?: {
        status: string
        sugestoes?: string[]
      }
    }
    conclusaoGeral?: string
  }
  createdAt: any
  batchAnalysis?: boolean
  batchPhotoCount?: number
  currentPlansSnapshot?: any
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

  const [hasConsent, setHasConsent] = useState(false)

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

    console.log("[v0] Loading history for user:", user.uid)

    const photosQuery = query(
      collection(db, "progressPhotos"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    )

    const unsubscribe = onSnapshot(
      photosQuery,
      (snapshot) => {
        console.log("[v0] History snapshot received, documents:", snapshot.docs.length)
        const photosData = snapshot.docs.map((doc) => {
          const data = doc.data()
          console.log("[v0] Document data:", doc.id, data)
          return {
            id: doc.id,
            ...data,
          }
        }) as ProgressPhoto[]

        console.log("[v0] Loaded photos:", photosData.length)
        setPhotos(photosData)
      },
      (error) => {
        console.error("[v0] Error loading history:", error)
      },
    )

    return unsubscribe
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
        console.error("[v0] ❌ Analysis FAILED with status:", analysisResponse.status)
        console.error("[v0] Error details:", errorData)

        if (errorData.policyViolation) {
          alert(`❌ ${errorData.error}\n\n${errorData.details}\n\n` + "Por favor, ajuste as fotos e tente novamente.")
        } else if (errorData.parseError) {
          alert(
            `⚠️ ${errorData.error}\n\n${errorData.details}\n\n` +
              "Entre em contato com o suporte se o problema persistir.",
          )
        } else {
          alert(errorData.details || errorData.error || "Failed to analyze photos")
        }
        throw new Error(errorData.details || errorData.error || "Failed to analyze photos")
      }

      const analysisData = await analysisResponse.json()
      console.log("[v0] ✅ Analysis completed successfully")
      console.log("[v0] Real diet totals used:", analysisData.realDietTotals)

      setCurrentAnalysis(analysisData.analysis)
      pendingPhotos.forEach((photo) => URL.revokeObjectURL(photo.preview))
      setPendingPhotos([])

      setTimeout(async () => {
        await loadHistory()
        setActiveTab("history")
        alert("Análise profissional concluída! Verifique o histórico para ver os resultados detalhados.")
      }, 1000)
    } catch (error) {
      console.error("[v0] ❌ Error in analysis process:", error)
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
          body: JSON.JSON.stringify({
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="mr-4 px-6 py-2.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white border-2 border-gray-600/50 transition-all flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Análise Corporal Profissional</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Receba feedback técnico de personal trainer e nutricionista especializado
            </p>
          </div>
        </div>

        {/* Tabs for Upload and History */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex gap-4 max-w-md">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all border-2 flex items-center justify-center gap-2 ${
                activeTab === "upload"
                  ? "bg-[#3B82F6] hover:bg-blue-600 text-white border-[#3B82F6] shadow-lg shadow-blue-500/30"
                  : "bg-[#0f121a] hover:bg-gray-800 text-white border-gray-600/50"
              }`}
            >
              <Camera className="h-4 w-4" />
              Nova Foto
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-6 py-3 rounded-full font-semibold transition-all border-2 flex items-center justify-center gap-2 ${
                activeTab === "history"
                  ? "bg-[#3B82F6] hover:bg-blue-600 text-white border-[#3B82F6] shadow-lg shadow-blue-500/30"
                  : "bg-[#0f121a] hover:bg-gray-800 text-white border-gray-600/50"
              }`}
            >
              <History className="h-4 w-4" />
              Histórico ({photos.length})
            </button>
          </div>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            {/* Upload Section */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                  <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Adicionar Fotos para Análise</span>
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Adicione 2 ou 3 fotos (frente, costas e/ou lateral) e envie todas juntas para análise completa
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xl font-bold text-white mb-6 text-center">Selecione o tipo de foto:</p>
                  <div className="flex gap-4 justify-center mb-6">
                    {[
                      { key: "front", label: "Frente" },
                      { key: "back", label: "Costas" },
                      { key: "side", label: "Lateral" },
                    ].map((type) => (
                      <button
                        key={type.key}
                        onClick={() => setSelectedPhotoType(type.key as "front" | "back" | "side")}
                        className={`
                          px-6 py-2 text-base font-semibold rounded-[2rem] border-[3px] transition-all
                          ${
                            selectedPhotoType === type.key
                              ? "bg-[#3B82F6] text-white border-[#60A5FA] shadow-lg shadow-blue-500/40"
                              : "bg-[#0f121a] text-gray-300 border-gray-600/50 hover:bg-[#1a1f2e]"
                          }
                        `}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="w-full px-6 py-4 text-lg font-bold rounded-[2rem] bg-[#3B82F6] hover:bg-[#2563EB] text-white border-[3px] border-[#60A5FA] shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Upload className="h-5 w-5 mr-3" />
                  Adicionar Foto {getPhotoTypeLabel(selectedPhotoType)}
                </button>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                {pendingPhotos.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fotos adicionadas ({pendingPhotos.length}):
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {pendingPhotos.map((photo) => (
                        <div key={photo.type} className="relative">
                          <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
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

                    <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <input
                        type="checkbox"
                        id="consent-checkbox"
                        checked={hasConsent}
                        onChange={(e) => setHasConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="consent-checkbox"
                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        Autorizo o envio das minhas fotos para análise profissional por inteligência artificial.
                        Compreendo que as imagens serão processadas de forma segura e confidencial para gerar feedback
                        personalizado sobre minha composição corporal e progresso fitness.
                      </label>
                    </div>

                    <Button
                      onClick={handleAnalyzePhotos}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={isAnalyzing || !hasConsent}
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

                <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <Camera className="h-4 w-4" />📸 Dicas para melhores fotos:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-gray-300 space-y-1">
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
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 border-purple-200 dark:border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-purple-500 dark:border-purple-400 rounded-full animate-spin border-t-transparent"></div>
                    <div>
                      <p className="font-medium text-purple-800 dark:text-purple-200">
                        {isAnalyzing && "IA analisando sua foto..."}
                        {isComparing && "Comparando com fotos anteriores..."}
                      </p>
                      <p className="text-sm text-purple-600 dark:text-purple-300">Isso pode levar alguns segundos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentAnalysis && !isAnalyzing && !isComparing && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 border-green-200 dark:border-gray-600">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedAnalysis(expandedAnalysis === "current" ? null : "current")}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
                      <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span>Resultado da sua Análise</span>
                    </CardTitle>
                    {expandedAnalysis === "current" ? (
                      <ChevronUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Clique para {expandedAnalysis === "current" ? "ocultar" : "ver"} a análise completa
                  </p>
                </CardHeader>

                {expandedAnalysis === "current" && (
                  <CardContent className="space-y-6 pt-4">
                    {/* Photo Preview */}
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-40 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
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
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Motivação
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">{currentAnalysis.motivacao}</p>
                      </div>
                    )}

                    {currentAnalysis.pontosForts && currentAnalysis.pontosForts.length > 0 && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✅ Pontos Fortes</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.pontosForts.map((ponto: string, idx: number) => (
                            <li key={idx} className="text-gray-700 dark:text-gray-300">
                              • {ponto}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.areasParaMelhorar && currentAnalysis.areasParaMelhorar.length > 0 && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700">
                        <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                          ⚠️ Áreas para Melhorar
                        </h4>
                        <ul className="space-y-1">
                          {currentAnalysis.areasParaMelhorar.map((area: string, idx: number) => (
                            <li key={idx} className="text-gray-700 dark:text-gray-300">
                              • {area}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.dicasEspecificas && currentAnalysis.dicasEspecificas.length > 0 && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 Dicas Específicas</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.dicasEspecificas.map((dica: string, idx: number) => (
                            <li key={idx} className="text-gray-700 dark:text-gray-300">
                              • {dica}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.focoPrincipal && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                        <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">🎯 Foco Principal</h4>
                        <p className="text-gray-700 dark:text-gray-300">{currentAnalysis.focoPrincipal}</p>
                      </div>
                    )}

                    {currentAnalysis.progressoGeral && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">📊 Progresso Geral</h4>
                        <p className="text-gray-700 dark:text-gray-300">{currentAnalysis.progressoGeral}</p>
                      </div>
                    )}

                    {currentAnalysis.recomendacoesTreino && currentAnalysis.recomendacoesTreino.length > 0 && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700">
                        <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">🏋️ Recomendações de Treino</h4>
                        <ul className="space-y-1">
                          {currentAnalysis.recomendacoesTreino.map((rec: string, idx: number) => (
                            <li key={idx} className="text-gray-700 dark:text-gray-300">
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.recomendacoesDieta && currentAnalysis.recomendacoesDieta.length > 0 && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700">
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                          🥗 Recomendações de Dieta
                        </h4>
                        <ul className="space-y-1">
                          {currentAnalysis.recomendacoesDieta.map((rec: string, idx: number) => (
                            <li key={idx} className="text-gray-700 dark:text-gray-300">
                              • {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Optimization Buttons */}
                    {currentAnalysis.otimizacoesSugeridas && (
                      <div className="space-y-4 pt-4 border-t border-green-200 dark:border-green-700">
                        <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Otimizações Sugeridas
                        </h4>

                        {currentAnalysis.otimizacoesSugeridas.dieta?.necessaria && (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                            <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                              🥗 Ajustes na Dieta
                            </h5>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                              {currentAnalysis.otimizacoesSugeridas.dieta.justificativa}
                            </p>
                            <ul className="text-sm text-yellow-700 dark:text-yellow-200 space-y-1 mb-3">
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
                          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-700">
                            <h5 className="font-medium text-red-900 dark:text-red-100 mb-2">🏋️ Ajustes no Treino</h5>
                            <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                              {currentAnalysis.otimizacoesSugeridas.treino.justificativa}
                            </p>
                            <ul className="text-sm text-red-700 dark:text-red-200 space-y-1 mb-3">
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
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Últimas Análises</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {photos.slice(0, 3).map((photo) => (
                    <Card key={photo.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 space-y-3">
                        <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
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
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(photo.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        {photo.analysis && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                            {photo.analysis.motivacao}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab("history")}
                  className="w-full mt-4 px-6 py-3 rounded-full bg-[#3B82F6] hover:bg-blue-600 text-white border-2 border-[#3B82F6] shadow-lg shadow-blue-500/30 font-semibold transition-all"
                >
                  Ver Histórico Completo
                </button>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            {photos.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Nenhuma foto ainda</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Comece enviando sua primeira foto para análise
                  </p>
                  <Button onClick={() => setActiveTab("upload")}>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Primeira Foto
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {photos.map((photo) => {
                  const photosList =
                    photo.photos || (photo.photoUrl ? [{ photoUrl: photo.photoUrl, photoType: photo.photoType }] : [])

                  let displayDate = "Data não disponível"
                  try {
                    if (photo.createdAt) {
                      if (typeof photo.createdAt === "string") {
                        displayDate = new Date(photo.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      } else if (photo.createdAt.toDate) {
                        displayDate = photo.createdAt.toDate().toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      } else if (photo.createdAt.seconds) {
                        displayDate = new Date(photo.createdAt.seconds * 1000).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      }
                    }
                  } catch (error) {
                    console.error("[v0] Error formatting date:", error)
                  }

                  const isExpanded = expandedAnalysis === photo.id

                  return (
                    <Card key={photo.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader
                        className="cursor-pointer hover:bg-muted/50 transition-colors py-4"
                        onClick={() => setExpandedAnalysis(isExpanded ? null : photo.id)}
                      >
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-medium text-gray-900 dark:text-white">
                            Avaliação dia {displayDate}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePhoto(photo.id)
                              }}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="px-6 pb-6">
                          {photosList.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                              {photosList.map((p: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                                >
                                  <img
                                    src={p.photoUrl || "/placeholder.svg"}
                                    alt={`Foto ${p.photoType}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute top-2 left-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {p.photoType === "front"
                                        ? "Frente"
                                        : p.photoType === "back"
                                          ? "Costas"
                                          : "Lateral"}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {photo.analysis ? (
                            <div className="space-y-4">
                              {/* Pontos Fortes */}
                              {photo.analysis.pontosFortes && photo.analysis.pontosFortes.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="text-base font-semibold text-green-600">Pontos Fortes</h3>
                                  <ul className="space-y-1">
                                    {photo.analysis.pontosFortes.map((ponto: string, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-green-600 mt-0.5 flex-shrink-0">✅</span>
                                        <span>{ponto}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Pontos a Melhorar */}
                              {photo.analysis.pontosAMelhorar && photo.analysis.pontosAMelhorar.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="text-base font-semibold text-orange-600">Pontos a Melhorar</h3>
                                  <ul className="space-y-1">
                                    {photo.analysis.pontosAMelhorar.map((ponto: string, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-orange-600 mt-0.5 flex-shrink-0">⚠️</span>
                                        <span>{ponto}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Composição Corporal */}
                              {photo.analysis.composicaoCorporal && (
                                <div className="space-y-2">
                                  <h3 className="text-base font-semibold">Composição Corporal</h3>
                                  <div className="bg-muted/50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">Gordura Corporal Estimada:</span>
                                      <span className="font-bold">
                                        {photo.analysis.composicaoCorporal.percentualGorduraEstimado}
                                      </span>
                                    </div>
                                    {photo.analysis.composicaoCorporal.massaMuscular && (
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">Massa Muscular:</span>
                                        <span className="font-bold capitalize">
                                          {photo.analysis.composicaoCorporal.massaMuscular}
                                        </span>
                                      </div>
                                    )}
                                    {photo.analysis.composicaoCorporal.observacoes && (
                                      <p className="text-muted-foreground dark:text-gray-400 pt-2 border-t dark:border-gray-700">
                                        {photo.analysis.composicaoCorporal.observacoes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Sobre o Treino */}
                              {photo.analysis.sobreTreino && (
                                <div className="space-y-2">
                                  <h3 className="text-base font-semibold">Sobre o Treino</h3>
                                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                                    {photo.analysis.sobreTreino}
                                  </p>
                                </div>
                              )}

                              {/* Sobre a Dieta */}
                              {photo.analysis.sobreDieta && (
                                <div className="space-y-2">
                                  <h3 className="text-base font-semibold">Sobre a Dieta</h3>
                                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                                    {photo.analysis.sobreDieta}
                                  </p>
                                </div>
                              )}

                              {/* Evolução Comparada */}
                              {photo.analysis.evolucaoComparada && (
                                <div className="space-y-2">
                                  <h3 className="text-base font-semibold text-blue-600">
                                    Evolução em Comparação à Última Avaliação
                                  </h3>
                                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-3">
                                    <p className="text-sm">
                                      <span className="font-medium">Período:</span>{" "}
                                      {photo.analysis.evolucaoComparada.diasDesdeUltimaAnalise} dias desde a última
                                      análise
                                    </p>
                                    <p className="text-sm font-medium">{photo.analysis.evolucaoComparada.resumo}</p>

                                    {photo.analysis.evolucaoComparada.melhorias &&
                                      photo.analysis.evolucaoComparada.melhorias.length > 0 && (
                                        <div>
                                          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
                                            Melhorias:
                                          </p>
                                          <ul className="space-y-1">
                                            {photo.analysis.evolucaoComparada.melhorias.map(
                                              (m: string, idx: number) => (
                                                <li key={idx} className="text-sm flex items-start gap-2">
                                                  <span className="text-green-600 flex-shrink-0">✅</span>
                                                  <span>{m}</span>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                      )}

                                    {photo.analysis.evolucaoComparada.retrocessos &&
                                      photo.analysis.evolucaoComparada.retrocessos.length > 0 && (
                                        <div>
                                          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                                            Retrocessos:
                                          </p>
                                          <ul className="space-y-1">
                                            {photo.analysis.evolucaoComparada.retrocessos.map(
                                              (r: string, idx: number) => (
                                                <li key={idx} className="text-sm flex items-start gap-2">
                                                  <span className="text-red-600 flex-shrink-0">⚠️</span>
                                                  <span>{r}</span>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        </div>
                                      )}

                                    {photo.analysis.evolucaoComparada.avaliacaoRitmo && (
                                      <p className="text-sm">
                                        <span className="font-medium">Avaliação do Ritmo:</span>{" "}
                                        <span className="capitalize">
                                          {photo.analysis.evolucaoComparada.avaliacaoRitmo}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Dicas */}
                              {photo.analysis.dicas && photo.analysis.dicas.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="text-base font-semibold">Dicas</h3>
                                  <ul className="space-y-1">
                                    {photo.analysis.dicas.map((dica: string, idx: number) => (
                                      <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-blue-600 mt-0.5 flex-shrink-0">💡</span>
                                        <span>{dica}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Ajustes (só aparece se necessário) */}
                              {photo.analysis.ajustes && photo.analysis.ajustes.necessario && (
                                <div className="space-y-3 border-l-4 border-yellow-500 pl-4 bg-yellow-50/50 dark:bg-yellow-950/20 p-4 rounded-r-lg">
                                  <h3 className="text-base font-semibold text-yellow-700 dark:text-yellow-400">
                                    Ajustes Recomendados
                                  </h3>

                                  {photo.analysis.ajustes.treino &&
                                    photo.analysis.ajustes.treino.status === "ajuste necessário" &&
                                    photo.analysis.ajustes.treino.sugestoes &&
                                    photo.analysis.ajustes.treino.sugestoes.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold">Treino:</p>
                                        <ul className="space-y-1">
                                          {photo.analysis.ajustes.treino.sugestoes.map((sug: string, idx: number) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                              <span className="text-yellow-600 flex-shrink-0">➤</span>
                                              <span>{sug}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                  {photo.analysis.ajustes.dieta &&
                                    photo.analysis.ajustes.dieta.status === "ajuste necessário" &&
                                    photo.analysis.ajustes.dieta.sugestoes &&
                                    photo.analysis.ajustes.dieta.sugestoes.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold">Dieta:</p>
                                        <ul className="space-y-1">
                                          {photo.analysis.ajustes.dieta.sugestoes.map((sug: string, idx: number) => (
                                            <li key={idx} className="text-sm flex items-start gap-2">
                                              <span className="text-yellow-600 flex-shrink-0">➤</span>
                                              <span>{sug}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                </div>
                              )}

                              {/* Conclusão Geral */}
                              {photo.analysis.conclusaoGeral && (
                                <div className="space-y-2 bg-primary/5 dark:bg-primary/10 rounded-lg p-4 border-l-4 border-primary pl-4">
                                  <h3 className="text-base font-semibold">Conclusão Geral</h3>
                                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                                    {photo.analysis.conclusaoGeral}
                                  </p>
                                </div>
                              )}

                              {!photo.analysis.pontosFortes &&
                                !photo.analysis.sobreTreino &&
                                (photo.analysis.desenvolvimentoMuscular ||
                                  photo.analysis.resumoExecutivo ||
                                  photo.analysis.composicaoCorporal) && (
                                  <div className="p-4 bg-muted/30 dark:bg-gray-800 rounded-lg text-sm text-center text-muted-foreground">
                                    Esta análise usa um formato anterior. As novas análises terão um formato mais
                                    organizado com seções claras.
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                              <p>Nenhuma análise disponível para esta avaliação.</p>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
