"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Save, Edit, Calendar, Target, RefreshCw } from "lucide-react"
import { db, auth } from "@/lib/firebaseClient"
import { doc, getDoc, setDoc } from "firebase/firestore"

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

interface PersonalData {
  age: string
  height: string
  phone: string
  email: string
  address: string
  emergencyContact: string
  medicalConditions: string
  allergies: string
}

export default function DadosPage() {
  const router = useRouter()
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [personalData, setPersonalData] = useState<PersonalData>({
    age: "",
    height: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    medicalConditions: "",
    allergies: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const loadAndSyncData = async () => {
      console.log("[v0] Loading user data...")
      setIsLoading(true)

      // First try localStorage
      let localQuizData = null
      let localPersonalData = null

      const savedQuizData = localStorage.getItem("quizData")
      const savedPersonalData = localStorage.getItem("personalData")

      if (savedQuizData) {
        localQuizData = JSON.parse(savedQuizData)
        console.log("[v0] Local quiz data found:", localQuizData?.name)
      }

      if (savedPersonalData) {
        localPersonalData = JSON.parse(savedPersonalData)
      }

      // Then try Firestore if user is authenticated
      if (auth.currentUser) {
        try {
          console.log("[v0] Fetching data from Firestore for user:", auth.currentUser.uid)
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))

          if (userDoc.exists()) {
            const firestoreData = userDoc.data()
            console.log("[v0] Firestore data found:", firestoreData)

            const firestoreQuizData = firestoreData.quizData || firestoreData
            console.log("[v0] Firestore quiz data:", firestoreQuizData?.name)

            // Use Firestore data as source of truth and update localStorage
            if (firestoreQuizData?.name && firestoreQuizData.name !== localQuizData?.name) {
              console.log("[v0] Syncing name from Firestore:", firestoreQuizData.name)
              const updatedQuizData = { ...localQuizData, ...firestoreQuizData }
              setQuizData(updatedQuizData)
              localStorage.setItem("quizData", JSON.stringify(updatedQuizData))
            } else {
              setQuizData(localQuizData)
            }

            // Merge personal data
            if (firestoreData.personalData) {
              const mergedPersonalData = { ...localPersonalData, ...firestoreData.personalData }
              setPersonalData(mergedPersonalData)
              localStorage.setItem("personalData", JSON.stringify(mergedPersonalData))
            } else {
              setPersonalData(localPersonalData || personalData)
            }
          } else {
            console.log("[v0] No Firestore data found, using localStorage")
            setQuizData(localQuizData)
            setPersonalData(localPersonalData || personalData)
          }
        } catch (error) {
          console.error("[v0] Error fetching from Firestore:", error)
          setQuizData(localQuizData)
          setPersonalData(localPersonalData || personalData)
        }
      } else {
        console.log("[v0] No authenticated user, using localStorage only")
        setQuizData(localQuizData)
        setPersonalData(localPersonalData || personalData)
      }

      setIsLoading(false)
    }

    loadAndSyncData()
  }, [])

  const handleSave = async () => {
    setIsSyncing(true)

    // Save to localStorage
    localStorage.setItem("personalData", JSON.stringify(personalData))

    // Save to Firestore if user is authenticated
    if (auth.currentUser) {
      try {
        console.log("[v0] Saving personal data to Firestore")
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            personalData: personalData,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
        console.log("[v0] Personal data saved to Firestore successfully")
      } catch (error) {
        console.error("[v0] Error saving to Firestore:", error)
      }
    }

    setIsSyncing(false)
    setIsEditing(false)
  }

  const handleSync = async () => {
    if (!auth.currentUser) return

    setIsSyncing(true)
    try {
      console.log("[v0] Manual sync requested")
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))

      if (userDoc.exists()) {
        const firestoreData = userDoc.data()
        const firestoreQuizData = firestoreData.quizData || firestoreData
        console.log("[v0] Syncing with latest Firestore data:", firestoreQuizData?.name)

        if (firestoreQuizData?.name) {
          const updatedQuizData = { ...quizData, ...firestoreQuizData }
          setQuizData(updatedQuizData)
          localStorage.setItem("quizData", JSON.stringify(updatedQuizData))
        }

        if (firestoreData.personalData) {
          setPersonalData(firestoreData.personalData)
          localStorage.setItem("personalData", JSON.stringify(firestoreData.personalData))
        }
      }
    } catch (error) {
      console.error("[v0] Error during manual sync:", error)
    }
    setIsSyncing(false)
  }

  const getGoalText = (goals: string[]) => {
    const goalMap: { [key: string]: string } = {
      "perder-peso": "Perder peso",
      "ganhar-massa": "Ganhar massa muscular",
      "melhorar-saude": "Melhorar saúde",
      "aumentar-resistencia": "Aumentar resistência",
    }
    return goals.map((goal) => goalMap[goal] || goal).join(", ")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seus dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800">Meus Dados</h1>
            <p className="text-gray-600">Gerencie suas informações pessoais</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizar
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? "Cancelar" : "Editar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Data (Read Only) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <span>Dados do Quiz</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Nome</Label>
                    <p className="font-medium">{quizData?.name || "Não informado"}</p>
                    {process.env.NODE_ENV === "development" && (
                      <p className="text-xs text-gray-400">Debug: {quizData?.name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Gênero</Label>
                    <p className="font-medium capitalize">{quizData?.gender || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Peso Atual</Label>
                    <p className="font-medium">{quizData?.currentWeight} kg</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Peso Meta</Label>
                    <p className="font-medium">{quizData?.targetWeight} kg</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Tipo Corporal</Label>
                  <Badge variant="outline" className="capitalize">
                    {quizData?.bodyType || "Não informado"}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm text-gray-600">Objetivos</Label>
                  <p className="font-medium">{getGoalText(quizData?.goal || [])}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Experiência</Label>
                    <Badge variant="outline" className="capitalize">
                      {quizData?.experience || "Não informado"}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Tempo de Treino</Label>
                    <p className="font-medium">{quizData?.workoutTime || "Não definido"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personal Data (Editable) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-green-500" />
                  <span>Dados Pessoais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Idade</Label>
                    <Input
                      id="age"
                      value={personalData.age}
                      onChange={(e) => setPersonalData((prev) => ({ ...prev, age: e.target.value }))}
                      placeholder="Ex: 25"
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input
                      id="height"
                      value={personalData.height}
                      onChange={(e) => setPersonalData((prev) => ({ ...prev, height: e.target.value }))}
                      placeholder="Ex: 175"
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={personalData.phone}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={personalData.address}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua, número, bairro, cidade"
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="emergencyContact">Contato de Emergência</Label>
                  <Input
                    id="emergencyContact"
                    value={personalData.emergencyContact}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                    placeholder="Nome e telefone"
                    disabled={!isEditing}
                  />
                </div>

                {isEditing && (
                  <Button onClick={handleSave} className="w-full" disabled={isSyncing}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSyncing ? "Salvando..." : "Salvar Dados"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Medical Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-red-500" />
                  <span>Informações Médicas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="medicalConditions">Condições Médicas</Label>
                  <Input
                    id="medicalConditions"
                    value={personalData.medicalConditions}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, medicalConditions: e.target.value }))}
                    placeholder="Diabetes, hipertensão, etc."
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <Label htmlFor="allergies">Alergias</Label>
                  <Input
                    id="allergies"
                    value={personalData.allergies}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, allergies: e.target.value }))}
                    placeholder="Alimentos, medicamentos, etc."
                    disabled={!isEditing}
                  />
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Importante:</strong> Sempre consulte um médico antes de iniciar qualquer programa de
                    exercícios ou dieta.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
