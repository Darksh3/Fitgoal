import { NextRequest, NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET(request: NextRequest) {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
          return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

  try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get("userId")

      // Se um userId específico for passado, buscar apenas esse documento
      if (userId) {
              const leadsDoc = await adminDb.collection("leads").doc(userId).get()
              if (!leadsDoc.exists) {
                        return NextResponse.json({ users: [] })
              }
              const data = leadsDoc.data()!
              const user = {
                        id: leadsDoc.id,
                        ...data,
                        visitedResults: data.visitedResults || false,
                        visitedCheckout: data.visitedCheckout || false,
              }
              return NextResponse.json({ users: [user] })
      }

      // Busca geral com limite para evitar leitura de coleção inteira
      const limit = parseInt(searchParams.get("limit") || "200")
        const leadsSnap = await adminDb.collection("leads").limit(limit).get()

      const users = leadsSnap.docs.map((d) => {
              const data = d.data()
              return {
                        id: d.id,
                        ...data,
                        visitedResults: data.visitedResults || false,
                        visitedCheckout: data.visitedCheckout || false,
              }
      })

      return NextResponse.json({ users })
  } catch (error) {
        console.error("[v0] Error fetching users:", error)
        return NextResponse.json({ error: "Erro ao carregar usuários" }, { status: 500 })
  }
}

export async function POST(request: Request) {
    const isAdmin = await isAdminRequest()
    if (!isAdmin) {
          return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

  try {
        const { userId, action, email, password, blocked } = await request.json()

      if (action === "update-email") {
              await auth.updateUser(userId, { email })
              await adminDb.collection("users").doc(userId).update({ email })
              return NextResponse.json({ success: true, message: "Email atualizado" })
      }

      if (action === "update-password") {
              await auth.updateUser(userId, { password })
              return NextResponse.json({ success: true, message: "Senha atualizada" })
      }

      if (action === "toggle-block") {
              await adminDb.collection("users").doc(userId).update({ blocked: blocked })
              return NextResponse.json({ success: true, message: blocked ? "Usuário bloqueado" : "Usuário desbloqueado" })
      }

      return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  } catch (error) {
        console.error("[v0] Error updating user:", error)
        return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 })
  }
}
