"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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

interface Measurements {
  weight: string
  height: string
  chest: string
  waist: string
  thigh: string
  leftArm: string
  rightArm: string
  leftLeg: string
  rightLeg: string
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
  const [measurements, setMeasurements] = useState<Measurements>({
    weight: "",
    height: "",
    chest: "",
    waist: "",
    thigh: "",
    leftArm: "",
    rightArm: "",
    leftLeg: "",
    rightLeg: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [hasOldData, setHasOldData] = useState(false)

  useEffect(() => {
    const loadAndSyncData = async () => {
      setIsLoading(true)

      let localQuizData = null
      let localPersonalData = null
      let localMeasurements = null

      const savedQuizData = localStorage.getItem("quizData")
      const savedPersonalData = localStorage.getItem("personalData")
      const savedMeasurements = localStorage.getItem("measurements")

      if (savedQuizData) {
        localQuizData = JSON.parse(savedQuizData)
      }

      if (savedPersonalData) {
        localPersonalData = JSON.parse(savedPersonalData)
      }

      if (savedMeasurements) {
        localMeasurements = JSON.parse(savedMeasurements)
      }

      if (auth.currentUser) {
        try {
          // Tentar carregar do users collection (onde o quizData é salvo)
          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))

          let firestoreQuizData = null
          let firestorePersonalData = null
          let firestoreMeasurements = null

          if (userDoc.exists()) {
            const userData = userDoc.data()
            firestoreQuizData = userData?.quizData
            firestorePersonalData = userData?.personalData
            firestoreMeasurements = userData?.measurements
          } else {
            // Se não existe em users, tentar em leads (compatibilidade)
            const leadsDoc = await getDoc(doc(db, "leads", auth.currentUser.uid))
            if (leadsDoc.exists()) {
              const leadsData = leadsDoc.data()
              firestoreQuizData = leadsData?.quizData
              firestorePersonalData = leadsData?.personalData
              firestoreMeasurements = leadsData?.measurements
            }
          }

          // Merge com prioridade: Firestore > localStorage > vazio
          const finalQuizData = {
            ...localQuizData,
            ...firestoreQuizData,
            // Garantir que campos importantes sempre estejam preenchidos
            experience: firestoreQuizData?.experience || localQuizData?.experience || "",
            workoutTime: firestoreQuizData?.workoutTime || localQuizData?.workoutTime || "",
            trainingDaysPerWeek: firestoreQuizData?.trainingDaysPerWeek || localQuizData?.trainingDaysPerWeek || "",
          }
          setQuizData(finalQuizData)
          localStorage.setItem("quizData", JSON.stringify(finalQuizData))

          const finalPersonalData = {
            age: firestorePersonalData?.age || localPersonalData?.age || finalQuizData?.age || "",
            height: firestorePersonalData?.height || localPersonalData?.height || finalQuizData?.height || "",
            phone: firestorePersonalData?.phone || localPersonalData?.phone || "",
            email: firestorePersonalData?.email || localPersonalData?.email || auth.currentUser.email || "",
            address: firestorePersonalData?.address || localPersonalData?.address || "",
            emergencyContact: firestorePersonalData?.emergencyContact || localPersonalData?.emergencyContact || "",
            medicalConditions: firestorePersonalData?.medicalConditions || localPersonalData?.medicalConditions || "",
            allergies: firestorePersonalData?.allergies || localPersonalData?.allergies || "",
          }
          setPersonalData(finalPersonalData)
          localStorage.setItem("personalData", JSON.stringify(finalPersonalData))

          const finalMeasurements = {
            weight: firestoreMeasurements?.weight || localMeasurements?.weight || finalQuizData?.currentWeight || "",
            height: firestoreMeasurements?.height || localMeasurements?.height || finalQuizData?.height || "",
            chest: firestoreMeasurements?.chest || localMeasurements?.chest || "",
            waist: firestoreMeasurements?.waist || localMeasurements?.waist || "",
            thigh: firestoreMeasurements?.thigh || localMeasurements?.thigh || "",
            leftArm: firestoreMeasurements?.leftArm || localMeasurements?.leftArm || "",
            rightArm: firestoreMeasurements?.rightArm || localMeasurements?.rightArm || "",
            leftLeg: firestoreMeasurements?.leftLeg || localMeasurements?.leftLeg || "",
            rightLeg: firestoreMeasurements?.rightLeg || localMeasurements?.rightLeg || "",
          }
          setMeasurements(finalMeasurements)
          localStorage.setItem("measurements", JSON.stringify(finalMeasurements))

          // Verificar dados antigos
          if (firestoreQuizData?.email && auth.currentUser.email && firestoreQuizData.email !== auth.currentUser.email) {
            setHasOldData(true)
          }
        } catch (error) {
          console.error("[v0] Error fetching from Firestore:", error)
          setQuizData(localQuizData)
          const preFilledData = {
            ...localPersonalData,
            age: localQuizData?.age || localPersonalData?.age || "",
            height: localQuizData?.height || localPersonalData?.height || "",
            email: auth.currentUser.email || localPersonalData?.email || "",
          }
          setPersonalData(preFilledData)

          const preFilledMeasurements = {
            ...localMeasurements,
            weight: localQuizData?.currentWeight || localMeasurements?.weight || "",
            height: localQuizData?.height || localMeasurements?.height || "",
          }
          setMeasurements(preFilledMeasurements)
        }
      } else {
        setQuizData(localQuizData)
        const preFilledData = {
          ...localPersonalData,
          age: localQuizData?.age || localPersonalData?.age || "",
          height: localQuizData?.height || localPersonalData?.height || "",
        }
        setPersonalData(preFilledData)

        const preFilledMeasurements = {
          ...localMeasurements,
          weight: localQuizData?.currentWeight || localMeasurements?.weight || "",
          height: localQuizData?.height || localMeasurements?.height || "",
        }
        setMeasurements(preFilledMeasurements)
      }

      setIsLoading(false)
    }

    loadAndSyncData()
  }, [])

  const handleSave = async () => {
    setIsSyncing(true)

    localStorage.setItem("personalData", JSON.stringify(personalData))
    localStorage.setItem("measurements", JSON.stringify(measurements))

    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          {
            personalData: personalData,
            measurements: measurements,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
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
      const leadsDoc = await getDoc(doc(db, "leads", auth.currentUser.uid))

      if (leadsDoc.exists()) {
        const firestoreData = leadsDoc.data()

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

          if (userDoc.exists() && userDoc.data().measurements) {
            setMeasurements(userDoc.data().measurements)
            localStorage.setItem("measurements", JSON.stringify(userDoc.data().measurements))
          }
        } catch (error) {}
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

      // Se dados ainda estão sendo processados, tentar novamente após delay
      if (result.code === "INCOMPLETE_DATA") {
        console.log("[CLEANUP] Dados ainda estão sendo gerados, tentando novamente em 3 segundos...")
        setTimeout(() => {
          handleCleanup()
        }, 3000)
        return
      }

      if (result.success) {
        localStorage.removeItem("quizData")
        localStorage.removeItem("personalData")
        localStorage.removeItem("measurements")

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
        setMeasurements({
          weight: "",
          height: "",
          chest: "",
          waist: "",
          thigh: "",
          leftArm: "",
          rightArm: "",
          leftLeg: "",
          rightLeg: "",
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
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Carregando seus dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="px-5 py-2 text-sm font-semibold rounded-full transition-all border-2 bg-white/5 backdrop-blur-md hover:bg-white/10 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2 inline" />
              Voltar
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meus Dados</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerencie suas informações pessoais</p>
            </div>
          </div>
          <div className="flex gap-2">
            {hasOldData && (
              <button
                onClick={handleCleanup}
                disabled={isCleaningUp}
                className="px-5 py-2 text-sm font-semibold rounded-full transition-all border-2 bg-red-600/80 hover:bg-red-700 text-white border-red-500/50 disabled:opacity-50"
              >
                <Trash2 className={`h-4 w-4 mr-2 inline ${isCleaningUp ? "animate-spin" : ""}`} />
                {isCleaningUp ? "Limpando..." : "Limpar Dados"}
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-5 py-2 text-sm font-semibold rounded-full transition-all border-2 bg-blue-600/80 hover:bg-blue-700 text-white border-blue-500/50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 inline ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizar
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-5 py-2 text-sm font-semibold rounded-full transition-all border-2 bg-white/5 backdrop-blur-md hover:bg-white/10 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-white/10"
            >
              <Edit className="h-4 w-4 mr-2 inline" />
              {isEditing ? "Cancelar" : "Editar"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-white/5 backdrop-blur-md border-gray-200 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Target className="h-5 w-5 text-blue-400" />
                Dados do Quiz
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">Nome</Label>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">
                    {quizData?.name || "Não informado"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">Gênero</Label>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg capitalize">
                    {quizData?.gender || "Não informado"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">Peso Atual</Label>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">
                    {quizData?.currentWeight ? `${quizData.currentWeight} kg` : "Não informado"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">Peso Meta</Label>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">
                    {quizData?.targetWeight ? `${quizData.targetWeight} kg` : "Não informado"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-gray-600 dark:text-gray-400 text-sm">Tipo Corporal</Label>
                <div className="mt-1">
                  <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 capitalize">
                    {quizData?.bodyType || "Não informado"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-gray-600 dark:text-gray-400 text-sm">Objetivos</Label>
                <p className="font-medium text-gray-900 dark:text-white">
                  {(() => {
                    if (!quizData?.goal) return "Não definido"
                    if (Array.isArray(quizData.goal) && quizData.goal.length > 0) {
                      return getGoalText(quizData.goal)
                    }
                    if (typeof quizData.goal === "string" && quizData.goal.length > 0) {
                      return quizData.goal
                    }
                    return "Não definido"
                  })()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">Experiência</Label>
                  <div className="mt-1">
                    <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 capitalize">
                      {quizData?.experience || "Não informado"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600 dark:text-gray-400 text-sm">Tempo de Treino</Label>
                  <p className="font-semibold text-gray-900 dark:text-white text-lg">
                    {quizData?.workoutTime || "Não definido"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-gray-600 dark:text-gray-400 text-sm">Dias de Treino por Semana</Label>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  {quizData?.trainingDaysPerWeek || "Não definido"}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white dark:bg-white/5 backdrop-blur-md border-gray-200 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <User className="h-5 w-5 text-green-400" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age" className="text-gray-600 dark:text-gray-400 text-sm">
                      Idade
                    </Label>
                    <Input
                      id="age"
                      value={personalData.age}
                      onChange={(e) => setPersonalData((prev) => ({ ...prev, age: e.target.value }))}
                      placeholder="25"
                      disabled={!isEditing}
                      className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-gray-600 dark:text-gray-400 text-sm">
                      Altura (cm)
                    </Label>
                    <Input
                      id="height"
                      value={personalData.height}
                      onChange={(e) => setPersonalData((prev) => ({ ...prev, height: e.target.value }))}
                      placeholder="178"
                      disabled={!isEditing}
                      className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-600 dark:text-gray-400 text-sm">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={personalData.phone}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-600 dark:text-gray-400 text-sm">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="cleber.neves013@gmail.com"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="text-gray-600 dark:text-gray-400 text-sm">
                    Endereço
                  </Label>
                  <Input
                    id="address"
                    value={personalData.address}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua, número, bairro, cidade"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="emergencyContact" className="text-gray-600 dark:text-gray-400 text-sm">
                    Contato de Emergência
                  </Label>
                  <Input
                    id="emergencyContact"
                    value={personalData.emergencyContact}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                    placeholder="Nome e telefone"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-white/5 backdrop-blur-md border-gray-200 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Calendar className="h-5 w-5 text-red-400" />
                  Informações Médicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="medicalConditions" className="text-gray-600 dark:text-gray-400 text-sm">
                    Condições Médicas
                  </Label>
                  <Input
                    id="medicalConditions"
                    value={personalData.medicalConditions}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, medicalConditions: e.target.value }))}
                    placeholder="Diabetes, hipertensão, etc."
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="allergies" className="text-gray-600 dark:text-gray-400 text-sm">
                    Alergias
                  </Label>
                  <Input
                    id="allergies"
                    value={personalData.allergies}
                    onChange={(e) => setPersonalData((prev) => ({ ...prev, allergies: e.target.value }))}
                    placeholder="Alimentos, medicamentos, etc."
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div className="p-4 bg-amber-100/90 border border-amber-300 rounded-xl">
                  <p className="text-sm text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Importante:</strong> Sempre consulte um médico antes de iniciar qualquer programa de
                      exercícios ou dieta.
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-white/5 backdrop-blur-md border-gray-200 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Calendar className="h-5 w-5 text-red-400" />
                  Medidas Corporais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="weight" className="text-gray-600 dark:text-gray-400 text-sm">
                    Peso (kg)
                  </Label>
                  <Input
                    id="weight"
                    value={measurements.weight}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, weight: e.target.value }))}
                    placeholder="80"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="bodyHeight" className="text-gray-600 dark:text-gray-400 text-sm">
                    Altura (cm)
                  </Label>
                  <Input
                    id="bodyHeight"
                    value={measurements.height}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, height: e.target.value }))}
                    placeholder="178"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="chest" className="text-gray-600 dark:text-gray-400 text-sm">
                    Peitoral (cm)
                  </Label>
                  <Input
                    id="chest"
                    value={measurements.chest}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, chest: e.target.value }))}
                    placeholder="105"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="waist" className="text-gray-600 dark:text-gray-400 text-sm">
                    Cintura (cm)
                  </Label>
                  <Input
                    id="waist"
                    value={measurements.waist}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, waist: e.target.value }))}
                    placeholder="85"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="thigh" className="text-gray-600 dark:text-gray-400 text-sm">
                    Quadril (cm)
                  </Label>
                  <Input
                    id="thigh"
                    value={measurements.thigh}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, thigh: e.target.value }))}
                    placeholder="60"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="leftArm" className="text-gray-600 dark:text-gray-400 text-sm">
                    Braço Esquerdo (cm)
                  </Label>
                  <Input
                    id="leftArm"
                    value={measurements.leftArm}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, leftArm: e.target.value }))}
                    placeholder="38"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="rightArm" className="text-gray-600 dark:text-gray-400 text-sm">
                    Braço Direito (cm)
                  </Label>
                  <Input
                    id="rightArm"
                    value={measurements.rightArm}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, rightArm: e.target.value }))}
                    placeholder="38"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="leftLeg" className="text-gray-600 dark:text-gray-400 text-sm">
                    Coxa Esquerda (cm)
                  </Label>
                  <Input
                    id="leftLeg"
                    value={measurements.leftLeg}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, leftLeg: e.target.value }))}
                    placeholder="60"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <Label htmlFor="rightLeg" className="text-gray-600 dark:text-gray-400 text-sm">
                    Coxa Direita (cm)
                  </Label>
                  <Input
                    id="rightLeg"
                    value={measurements.rightLeg}
                    onChange={(e) => setMeasurements((prev) => ({ ...prev, rightLeg: e.target.value }))}
                    placeholder="60"
                    disabled={!isEditing}
                    className="bg-gray-100 dark:bg-white/5 backdrop-blur-md border-2 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSyncing}
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.7)] transition-all duration-300 flex items-center gap-3 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed z-50"
        >
          <Save className="h-6 w-6" />
          {isSyncing ? "Salvando..." : "Salvar Dados"}
        </button>
      </div>
    </div>
  )
}
