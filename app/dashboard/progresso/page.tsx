"use client"

import { useState } from "react"

import { useRef } from "react"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, Camera, Trash2, Eye, Sparkles } from "lucide-react"

interface ProgressPhoto {
  id: string
  date: string
  type: "front" | "back" | "side"
  url: string
  analysis?: string
}

export default function ProgressoPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [selectedPhotoType, setSelectedPhotoType] = useState<"front" | "back" | "side">("front")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    const savedPhotos = localStorage.getItem("userProgressPhotos")
    if (savedPhotos) {
      setPhotos(JSON.parse(savedPhotos))
    }
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newPhoto: ProgressPhoto = {
          id: Date.now().toString(),
          date: new Date().toISOString().split("T")[0],
          type: selectedPhotoType,
          url: e.target?.result as string,
        }
        const updatedPhotos = [...photos, newPhoto]
        setPhotos(updatedPhotos)
        localStorage.setItem("userProgressPhotos", JSON.stringify(updatedPhotos))

        // Simular análise da IA
        setIsAnalyzing(true)
        setTimeout(() => {
          const photosWithAnalysis = updatedPhotos.map((photo) =>
            photo.id === newPhoto.id ? { ...photo, analysis: generateAIAnalysis(selectedPhotoType) } : photo,
          )
          setPhotos(photosWithAnalysis)
          localStorage.setItem("userProgressPhotos", JSON.stringify(photosWithAnalysis))
          setIsAnalyzing(false)
        }, 3000)
      }
      reader.readAsDataURL(file)
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

  const deletePhoto = (id: string) => {
    const updatedPhotos = photos.filter((photo) => photo.id !== id)
    setPhotos(updatedPhotos)
    localStorage.setItem("userProgressPhotos", JSON.stringify(updatedPhotos))
  }

  const getPhotoTypeLabel = (type: string) => {
    const labels = {
      front: "Frente",
      back: "Costas",
      side: "Lateral",
    }
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
            <p className="text-gray-600">Acompanhe sua evolução com análise de IA</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
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
                {["front", "back", "side"].map((type) => (
                  <Button
                    key={type}
                    variant={selectedPhotoType === type ? "default" : "outline"}
                    onClick={() => setSelectedPhotoType(type as "front" | "back" | "side")}
                    className="flex-1"
                  >
                    {getPhotoTypeLabel(type)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <Button onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Escolher Foto
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
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
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Status */}
        {isAnalyzing && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <div>
                  <p className="font-medium text-purple-800">IA analisando sua foto...</p>
                  <p className="text-sm text-purple-600">Isso pode levar alguns segundos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <Card key={photo.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={getPhotoTypeColor(photo.type)}>{getPhotoTypeLabel(photo.type)}</Badge>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => window.open(photo.url, "_blank")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePhoto(photo.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.url || "/placeholder.svg"}
                    alt={`Foto ${getPhotoTypeLabel(photo.type)}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">{new Date(photo.date).toLocaleDateString("pt-BR")}</p>

                  {photo.analysis ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Sparkles className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-800 mb-1">Análise da IA:</p>
                          <p className="text-sm text-green-700">{photo.analysis}</p>
                        </div>
                      </div>
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

        {photos.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-800 mb-2">Nenhuma foto ainda</h3>
              <p className="text-gray-600 mb-6">
                Comece adicionando suas primeiras fotos de progresso para acompanhar sua evolução
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Adicionar Primeira Foto
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
