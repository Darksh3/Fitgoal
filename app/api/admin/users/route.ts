import { NextResponse } from "next/server"
import { adminDb, auth } from "@/lib/firebaseAdmin"
import { isAdminRequest } from "@/lib/adminServerVerify"

export async function GET() {
  const isAdmin = await isAdminRequest()
  if (!isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Fetch users from the 'leads' collection which contains the visit tracking data
    const leadsSnap = await adminDb.collection("leads").get()
    const users = leadsSnap.docs.map((d) => {
      const data = d.data()
      console.log(`[v0] Lead ${d.id}:`, {
        visitedResults: data.visitedResults,
        visitedCheckout: data.visitedCheckout,
        email: data.email,
      })
      return { 
        id: d.id, 
        ...data,
        // Ensure we're getting the tracking fields
        visitedResults: data.visitedResults || false,
        visitedCheckout: data.visitedCheckout || false,
      }
    })
    
    console.log(`[v0] Total users fetched:`, users.length)
    console.log(`[v0] Users data:`, users)

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
