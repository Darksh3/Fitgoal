import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"

export async function POST(request: NextRequest) {
    try {
          const body = await request.json()
          const { sessionId, uid, step, totalSteps } = body

      if (!sessionId || typeof step !== "number") {
              return NextResponse.json({ error: "sessionId e step são obrigatórios" }, { status: 400 })
      }

      const sessionRef = adminDb.collection("quiz_sessions").doc(sessionId)
          const now = Date.now()
          const isCompleted = step >= totalSteps

      const sessionSnap = await sessionRef.get()

      if (!sessionSnap.exists) {
              // Criar nova sessão
            await sessionRef.set({
                      sessionId,
                      uid: uid || null,
                      createdAt: new Date().toISOString(),
                      completed: isCompleted,
                      totalSteps: totalSteps || 30,
                      lastStep: step,
                      updatedAt: new Date().toISOString(),
                      stepTimestamps: { [String(step)]: now },
            })
      } else {
              // Atualizar sessão existente
            await sessionRef.update({
                      [`stepTimestamps.${step}`]: now,
                      lastStep: step,
                      completed: isCompleted,
                      updatedAt: new Date().toISOString(),
                      ...(uid ? { uid } : {}),
            })
      }

      return NextResponse.json({ success: true, sessionId, step, completed: isCompleted })
    } catch (error: any) {
          console.error("[v0] TRACK_QUIZ_STEP - Erro:", error?.message)
          return NextResponse.json({ error: "Erro ao registrar passo do quiz" }, { status: 500 })
    }
}
