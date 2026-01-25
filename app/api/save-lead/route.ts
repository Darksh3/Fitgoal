import { NextRequest, NextResponse } from "next/server"
import * as admin from "firebase-admin"
import { getFirebaseAdmin } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { quizData, uid, name, email } = body

    console.log("[v0] SAVE_LEAD_API - Starting to save lead for:", uid)

    if (!uid || !quizData) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    const adminDb = getFirebaseAdmin().firestore()

    // Preparar dados do lead com todas as informações do quiz
    const leadData = {
      uid: uid,
      name: name || quizData.name || "Unknown",
      email: email || quizData.email || "unknown@example.com",
      gender: quizData.gender || null,
      age: quizData.age || null,
      height: quizData.height || null,
      currentWeight: quizData.currentWeight || null,
      targetWeight: quizData.targetWeight || null,
      bodyFat: quizData.bodyFat || null,
      imc: quizData.imc || null,
      imcClassification: quizData.imcClassification || null,
      imcStatus: quizData.imcStatus || null,
      bodyType: quizData.bodyType || null,
      goals: quizData.goal || [],
      subGoal: quizData.subGoal || null,
      problemAreas: quizData.problemAreas || [],
      diet: quizData.diet || null,
      allergies: quizData.allergies || null,
      allergyDetails: quizData.allergyDetails || null,
      sugarFrequency: quizData.sugarFrequency || [],
      waterIntake: quizData.waterIntake || null,
      healthConditions: quizData.healthConditions || [],
      wantsSupplement: quizData.wantsSupplement || null,
      supplementType: quizData.supplementType || null,
      weightChangeType: quizData.weightChangeType || null,
      timeToGoal: quizData.timeToGoal || null,
      experience: quizData.experience || null,
      equipment: quizData.equipment || [],
      exercisePreferences: quizData.exercisePreferences || {},
      trainingDaysPerWeek: quizData.trainingDaysPerWeek || 0,
      trainingDays: quizData.trainingDays || null,
      workoutTime: quizData.workoutTime || null,
      strengthTraining: quizData.strengthTraining || null,
      cardioFeeling: quizData.cardioFeeling || null,
      strengthFeeling: quizData.strengthFeeling || null,
      stretchingFeeling: quizData.stretchingFeeling || null,
      previousProblems: quizData.previousProblems || [],
      additionalGoals: quizData.additionalGoals || [],
      foodPreferences: quizData.foodPreferences || {},
      alcoholFrequency: quizData.alcoholFrequency || null,
      letMadMusclesChoose: quizData.letMadMusclesChoose || false,
      // Meta data
      status: "lead", // Novo lead que completou o quiz
      source: "quiz", // Origem do lead
      completedQuizAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    // Salvar o lead na collection 'leads' com uid como documento ID
    await adminDb.collection("leads").doc(uid).set(leadData, { merge: true })
    console.log("[v0] LEAD_SAVED_SUCCESSFULLY - Lead saved for:", uid)

    // Também salvar os dados do quiz no documento do usuário para referência
    await adminDb.collection("users").doc(uid).set(
      {
        quizData: quizData,
        quizCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        name: name || quizData.name,
        email: email || quizData.email,
      },
      { merge: true }
    )
    console.log("[v0] USER_QUIZ_DATA_SAVED - Quiz data saved in user document for:", uid)

    return NextResponse.json(
      {
        success: true,
        message: "Lead saved successfully",
        leadId: uid,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("[v0] SAVE_LEAD_ERROR - Error saving lead:", {
      error: error.message,
      stack: error.stack,
    })

    return NextResponse.json(
      {
        error: "Failed to save lead",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
