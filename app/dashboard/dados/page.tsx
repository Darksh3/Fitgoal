"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Save, Edit, Calendar, Target, RefreshCw, Trash2, AlertTriangle } from "lucide-react"
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
  trainingDaysPerWeek: string
  age?: string
  height?: string
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
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [hasOldData, setHasOldData] = useState(false)

  useEffect(() => {
    const loadAndSyncData = async () => {
      console.log("[v0] Loading user data...")
      setIsLoading(true)

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

      if (auth.currentUser) {
        try {
          console.log("[v0] Fetching data from Firestore leads collection for user:", auth.currentUser.uid)
          const leadsDoc = await getDoc(doc(db, "leads", auth.currentUser.uid))

          if (leadsDoc.exists()) {
            const firestoreData = leadsDoc.data()
            console.log("[v0] Firestore leads data found:", firestoreData)

            const currentUserEmail = auth.currentUser.email
            if (firestoreData?.email && currentUserEmail && firestoreData.email !== currentUserEmail) {
              console.log("[v0] Detected old user data:", firestoreData.email, "vs current:", currentUserEmail)
              setHasOldData(true)
            }

            console.log("[v0] Firestore quiz data name:", firestoreData?.name)
            console.log("[v0] Firestore training frequency:", firestoreData?.trainingDaysPerWeek)

            if (firestoreData?.name && firestoreData.name !== localQuizData?.name) {
              console.log("[v0] Syncing name from Firestore:", firestoreData.name)
              const updatedQuizData = { ...localQuizData, ...firestoreData }
              setQuizData(updatedQuizData)
              localStorage.setItem("quizData", JSON.stringify(updatedQuizData))
            } else {
              setQuizData(localQuizData || firestoreData)
            }

            try {
              const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
              if (userDoc.exists()) {
                const userData = userDoc.data()

                if (userData.personalData) {
                  const mergedPersonalData = { ...localPersonalData, ...userData.personalData }
                  setPersonalData(mergedPersonalData)
                  localStorage.setItem("personalData", JSON.stringify(mergedPersonalData))
                } else {
                  // Pre-fill from quiz data if available
                  const preFilledData = {
                    ...localPersonalData,
                    age: userData.quizData?.age || localQuizData?.age || localPersonalData?.age || "",
                    height: userData.quizData?.height || localQuizData?.height || localPersonalData?.height || "",
                    email: auth.currentUser.email || localPersonalData?.email || "",
                  }
                  setPersonalData(preFilledData)
                }
              } else {
                const preFilledData = {
                  ...localPersonalData,
                  age: localQuizData?.age || localPersonalData?.age || "",
                  height: localQuizData?.height || localPersonalData?.height || "",
                  email: auth.currentUser.email || localPersonalData?.email || "",
                }
                setPersonalData(preFilledData)
              }
            } catch (error) {
              console.log("[v0] No personal data in users collection, using localStorage")
              const preFilledData = {
                ...localPersonalData,
                age: localQuizData?.age || localPersonalData?.age || "",
                height: localQuizData?.height || localPersonalData?.height || "",
                email: auth.currentUser.email || localPersonalData?.email || "",
              }
              setPersonalData(preFilledData)
            }
          } else {
            console.log("[v0] No Firestore leads data found, using localStorage")
            setQuizData(localQuizData)
            const preFilledData = {
              ...localPersonalData,
              age: localQuizData?.age || localPersonalData?.age || "",
              height: localQuizData?.height || localPersonalData?.height || "",
              email: auth.currentUser?.email || localPersonalData?.email || "",
            }
            setPersonalData(preFilledData)
          }
        } catch (error) {
          console.error("[v0] Error fetching from Firestore:", error)
          setQuizData(localQuizData)
          const preFilledData = {
            ...localPersonalData,
            age: localQuizData?.age || localPersonalData?.age || "",
            height: localQuizData?.height || localPersonalData?.height || "",
            email: auth.currentUser?.email || localPersonalData?.email || "",
          }
          setPersonalData(preFilledData)
        }
      } else {
        console.log("[v0] No authenticated user, using localStorage only")
        setQuizData(localQuizData)
        const preFilledData = {
          ...localPersonalData,
          age: localQuizData?.age || localPersonalData?.age || "",
          height: localQuizData?.height || localPersonalData?.height || "",
        }
        setPersonalData(preFilledData)
      }

      setIsLoading(false)
    }

    loadAndSyncData()
  }, [])

  const handleSave = async () => {
    setIsSyncing(true)

    localStorage.setItem("personalData", JSON.stringify(personalData))

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
      const leadsDoc = await getDoc(doc(db, "leads", auth.currentUser.uid))

      if (leadsDoc.exists()) {
        const firestoreData = leadsDoc.data()
        console.log("[v0] Syncing with latest Firestore leads data:", firestoreData?.name)

        if (firestoreData?.name) {
          const updatedQuizData = { ...quizData, ...firestoreData }
          setQuizData(updatedQuizData)
          localStorage.setItem("quizData", JSON.stringify(updatedQuizData))
        }

        try {
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
          if (userDoc.exists() && userDoc.data().personalData) {
            setPersonalData(userDoc.data().personalData)
            localStorage.setItem("personalData", JSON.stringify(userDoc.data().personalData))
          }
        } catch (error) {
          console.log("[v0] No personal data in users collection")
        }
      }
    } catch (error) {
      console.error("[v0] Error during manual sync:", error)
    }
    setIsSyncing(false)
  }

  const handleCleanup = async () => {
    if (!auth.currentUser?.email) return

    setIsCleaningUp(true)
    try {
      console.log("[v0] Starting cleanup for email:", auth.currentUser.email)

      const response = await fetch("/api/cleanup-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: auth.currentUser.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("[v0] Cleanup successful:", result)

        localStorage.removeItem("quizData")
        localStorage.removeItem("personalData")

        setQuizData(null)
        setPersonalData({
          age: "",
          height: "",
          phone: "",
          email: "",
          address: "",
          emergencyContact: "",
          medicalConditions: "",
          allergies: "",
        })
        setHasOldData(false)

        alert("Limpeza completa realizada! Você pode refazer o quiz agora.")
      } else {
        console.error("[v0] Cleanup failed:", result)
        alert("Erro na limpeza: " + result.error)
      }
    } catch (error) {
      console.error("[v0] Error during cleanup:", error)
      alert("Erro durante a limpeza. Tente novamente.")
    }
    setIsCleaningUp(false)
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
        {hasOldData && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-800">Dados de usuário anterior detectados</h3>
                <p className="text-sm text-orange-700">
                  Foram encontrados dados de um usuário anterior. Recomendamos fazer uma limpeza completa antes de
                  continuar.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanup}
                disabled={isCleaningUp}
                className="border-orange-300 text-orange-700 hover:bg-orange-100 bg-transparent"
              >
                <Trash2 className={`h-4 w-4 mr-2 ${isCleaningUp ? "animate-spin" : ""}`} />
                {isCleaningUp ? "Limpando..." : "Limpar Dados"}
              </Button>
            </div>
          </div>
        )}

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

                <div>
                  <Label className="text-sm text-gray-600">Dias de Treino por Semana</Label>
                  <p className="font-medium">{quizData?.trainingDaysPerWeek || "Não definido"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

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
