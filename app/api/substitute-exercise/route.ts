import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { adminDb } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const { userId, dayIndex, exerciseIndex, currentExercise, userPreferences } = await request.json()

    console.log("[SUBSTITUTE_EXERCISE] Request received:", {
      userId,
      dayIndex,
      exerciseIndex,
      currentExercise: currentExercise?.name,
      userPreferences: userPreferences ? "provided" : "not provided",
    })

    // Validate required parameters
    if (!userId || dayIndex === undefined || exerciseIndex === undefined || !currentExercise) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
    }

    // Create detailed prompt for exercise substitution
    const prompt = `
Você é um especialista em educação física e musculação. Preciso que você substitua um exercício por outro equivalente.

EXERCÍCIO ATUAL:
- Nome: ${currentExercise.name}
- Séries: ${currentExercise.sets}
- Repetições: ${currentExercise.reps}
- Descanso: ${currentExercise.rest}
- Descrição: ${currentExercise.description}

CRITÉRIOS PARA SUBSTITUIÇÃO:
1. MESMO GRUPO MUSCULAR: O novo exercício deve trabalhar exatamente os mesmos músculos principais
2. MOVIMENTO SIMILAR: Padrão de movimento parecido (empurrar, puxar, agachamento, etc.)
3. NÍVEL DE DIFICULDADE: Manter o mesmo nível de complexidade
4. EQUIPAMENTO: Preferencialmente usar equipamentos similares ou alternativos comuns

${userPreferences?.experience ? `EXPERIÊNCIA DO USUÁRIO: ${userPreferences.experience}` : ""}
${userPreferences?.equipment ? `EQUIPAMENTOS DISPONÍVEIS: ${userPreferences.equipment}` : ""}
${userPreferences?.limitations ? `LIMITAÇÕES/LESÕES: ${userPreferences.limitations}` : ""}

RETORNE APENAS UM JSON no seguinte formato:
{
  "name": "Nome do novo exercício",
  "sets": "${currentExercise.sets}",
  "reps": "${currentExercise.reps}",
  "rest": "${currentExercise.rest}",
  "description": "Descrição detalhada da execução do novo exercício",
  "muscleGroups": ["músculo1", "músculo2"],
  "reason": "Breve explicação do por que este exercício é uma boa substituição"
}

IMPORTANTE: 
- Mantenha as mesmas séries, repetições e descanso
- O novo exercício deve ser diferente do atual
- Foque em exercícios práticos e executáveis
- A descrição deve ser clara e didática
`

    console.log("[SUBSTITUTE_EXERCISE] Calling OpenAI...")

    const result = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
    })

    console.log("[SUBSTITUTE_EXERCISE] OpenAI response:", result.text)

    // Parse the response
    let substitution
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        substitution = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("[SUBSTITUTE_EXERCISE] Failed to parse OpenAI response:", parseError)

      // Fallback substitution based on exercise type
      substitution = createFallbackSubstitution(currentExercise)
    }

    // Validate substitution structure
    if (!substitution.name || !substitution.description) {
      substitution = createFallbackSubstitution(currentExercise)
    }

    console.log("[SUBSTITUTE_EXERCISE] Final substitution:", substitution)

    // Update the workout plan in Firestore
    try {
      const userDocRef = adminDb.collection("users").doc(userId)
      const userDoc = await userDocRef.get()

      if (userDoc.exists) {
        const userData = userDoc.data()
        const workoutPlan = userData?.workoutPlan

        if (workoutPlan?.days?.[dayIndex]?.exercises?.[exerciseIndex]) {
          // Update the specific exercise
          workoutPlan.days[dayIndex].exercises[exerciseIndex] = {
            name: substitution.name,
            sets: substitution.sets,
            reps: substitution.reps,
            rest: substitution.rest,
            description: substitution.description,
          }

          // Save back to Firestore
          await userDocRef.update({ workoutPlan })
          console.log("[SUBSTITUTE_EXERCISE] Workout plan updated in Firestore")
        }
      }
    } catch (firestoreError) {
      console.error("[SUBSTITUTE_EXERCISE] Error updating Firestore:", firestoreError)
      // Continue anyway - the substitution can still be returned
    }

    return NextResponse.json({
      success: true,
      substitution,
      type: "exercise",
    })
  } catch (error) {
    console.error("[SUBSTITUTE_EXERCISE] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

function createFallbackSubstitution(currentExercise: any) {
  // Simple fallback based on exercise name patterns
  const exerciseName = currentExercise.name.toLowerCase()

  const fallbackExercise = {
    name: "Exercício Alternativo",
    sets: currentExercise.sets,
    reps: currentExercise.reps,
    rest: currentExercise.rest,
    description: "Exercício alternativo para o mesmo grupo muscular.",
    muscleGroups: ["geral"],
    reason: "Substituto padrão mantendo o mesmo padrão de movimento.",
  }

  // Basic substitutions based on exercise patterns
  if (exerciseName.includes("supino")) {
    fallbackExercise.name = "Flexão de Braços"
    fallbackExercise.description =
      "Deite-se de bruços, apoie as mãos no chão na largura dos ombros e execute o movimento de flexão."
    fallbackExercise.muscleGroups = ["peitoral", "tríceps"]
  } else if (exerciseName.includes("agachamento")) {
    fallbackExercise.name = "Agachamento Livre"
    fallbackExercise.description =
      "Pés na largura dos ombros, desça flexionando joelhos e quadris, mantendo as costas retas."
    fallbackExercise.muscleGroups = ["quadríceps", "glúteos"]
  } else if (exerciseName.includes("rosca")) {
    fallbackExercise.name = "Rosca Martelo"
    fallbackExercise.description = "Com halteres, mantenha os punhos neutros e flexione os cotovelos alternadamente."
    fallbackExercise.muscleGroups = ["bíceps"]
  } else if (exerciseName.includes("puxada")) {
    fallbackExercise.name = "Remada com Halteres"
    fallbackExercise.description = "Inclinado, puxe os halteres em direção ao abdômen, contraindo as escápulas."
    fallbackExercise.muscleGroups = ["dorsais", "bíceps"]
  }

  return fallbackExercise
}
