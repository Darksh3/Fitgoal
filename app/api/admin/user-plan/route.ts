import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: Request) {
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 })
  }

  try {
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userData = userDoc.data()

    return NextResponse.json({
      subscription: userData?.subscription,
      expirationDate: userData?.expirationDate,
      blocked: userData?.blocked || false
    })
  } catch (error) {
    console.error("[v0] Error fetching user plan:", error)
    return NextResponse.json({ error: "Erro ao carregar plano" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { userId, action, daysToAdd, newExpirationDate } = await request.json()

    if (action === "add-days") {
      const userDoc = await adminDb.collection("users").doc(userId).get()
      const currentExpiration = userDoc.data()?.expirationDate

      let newDate = new Date()
      if (currentExpiration) {
        newDate = new Date(currentExpiration)
      }
      newDate.setDate(newDate.getDate() + daysToAdd)

      await adminDb.collection("users").doc(userId).update({
        expirationDate: newDate.toISOString()
      })

      return NextResponse.json({ success: true, newExpirationDate: newDate.toISOString() })
    }

    if (action === "set-expiration") {
      await adminDb.collection("users").doc(userId).update({
        expirationDate: newExpirationDate
      })

      return NextResponse.json({ success: true, message: "Data de expiração atualizada" })
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error updating plan:", error)
    return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 })
  }
}
