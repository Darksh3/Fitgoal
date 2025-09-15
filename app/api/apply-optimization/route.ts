import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userId, optimizations, photoId } = await request.json()

    if (!userId || !optimizations) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const userDocRef = adminDb.collection("users").doc(userId)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const currentPlans = {
      dietPlan: userData?.dietPlan,
      workoutPlan: userData?.workoutPlan,
      scientificCalculations: userData?.scientificCalculations,
    }

    const updatedDietPlan = currentPlans.dietPlan
    const updatedWorkoutPlan = currentPlans.workoutPlan
    const updatedScientificCalcs = currentPlans.scientificCalculations

    // Apply diet optimizations
    if (optimizations.dieta?.necessaria && optimizations.dieta?.mudancas?.length > 0) {
      // Adjust calories based on optimization suggestions
      const currentCalories = Number.parseInt(updatedDietPlan?.totalDailyCalories?.replace(/\D/g, "") || "0")

      for (const mudanca of optimizations.dieta.mudancas) {
        if (mudanca.toLowerCase().includes("reduzir") && mudanca.toLowerCase().includes("caloria")) {
          const reduction = mudanca.match(/(\d+)/)?.[1] || "200"
          const newCalories = Math.max(1200, currentCalories - Number.parseInt(reduction))
          updatedDietPlan.totalDailyCalories = `${newCalories} kcal`

          if (updatedScientificCalcs) {
            updatedScientificCalcs.finalCalories = newCalories
          }
        } else if (mudanca.toLowerCase().includes("aumentar") && mudanca.toLowerCase().includes("caloria")) {
          const increase = mudanca.match(/(\d+)/)?.[1] || "200"
          const newCalories = currentCalories + Number.parseInt(increase)
          updatedDietPlan.totalDailyCalories = `${newCalories} kcal`

          if (updatedScientificCalcs) {
            updatedScientificCalcs.finalCalories = newCalories
          }
        }
      }
    }

    // Apply workout optimizations
    if (optimizations.treino?.necessaria && optimizations.treino?.mudancas?.length > 0) {
      for (const mudanca of optimizations.treino.mudancas) {
        if (mudanca.toLowerCase().includes("aumentar") && mudanca.toLowerCase().includes("cardio")) {
          // Add cardio recommendations to workout tips
          if (!updatedWorkoutPlan.tips) {
            updatedWorkoutPlan.tips = []
          }
          updatedWorkoutPlan.tips.push("Adicione 20-30 minutos de cardio após o treino de força")
        }
      }
    }

    const updateData = {
      dietPlan: updatedDietPlan,
      workoutPlan: updatedWorkoutPlan,
      scientificCalculations: updatedScientificCalcs,
      lastOptimization: {
        appliedAt: new Date().toISOString(),
        photoId: photoId,
        optimizations: optimizations,
        previousPlans: currentPlans,
      },
      updatedAt: new Date().toISOString(),
    }

    await userDocRef.update(updateData)

    if (photoId) {
      const photoDocRef = adminDb.collection("progressPhotos").doc(photoId)
      await photoDocRef.update({
        optimizationApplied: true,
        optimizationAppliedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Otimizações aplicadas com sucesso!",
      updatedPlans: {
        dietPlan: updatedDietPlan,
        workoutPlan: updatedWorkoutPlan,
      },
    })
  } catch (error) {
    console.error("Error applying optimization:", error)
    return NextResponse.json({ error: "Failed to apply optimization" }, { status: 500 })
  }
}
