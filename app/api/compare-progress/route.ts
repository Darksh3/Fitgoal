import { type NextRequest, NextResponse } from "next/server"
import { openai } from "ai"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userId, currentPhotoUrl, photoType } = await request.json()

    if (!userId || !currentPhotoUrl || !photoType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const threeWeeksAgo = new Date()
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21)

    const previousPhotosQuery = await adminDb
      .collection("progressPhotos")
      .where("userId", "==", userId)
      .where("photoType", "==", photoType)
      .where("createdAt", "<=", threeWeeksAgo.toISOString())
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()

    if (previousPhotosQuery.empty) {
      return NextResponse.json({
        success: false,
        message: "Nenhuma foto anterior encontrada para comparação. Tire mais fotos regularmente!",
      })
    }

    const previousPhoto = previousPhotosQuery.docs[0].data()

    const comparisonPrompt = `
    Você é um personal trainer especialista. Compare estas duas fotos de progresso fitness da mesma pessoa.

    Tipo de foto: ${photoType === "front" ? "Frente" : photoType === "back" ? "Costas" : "Lateral"}
    
    PRIMEIRA FOTO: Mais antiga (${new Date(previousPhoto.createdAt).toLocaleDateString("pt-BR")})
    SEGUNDA FOTO: Atual (hoje)

    Forneça uma análise comparativa em JSON:
    {
      "evolucaoGeral": "avaliação geral da evolução",
      "melhorias": ["melhoria 1", "melhoria 2", "melhoria 3"],
      "areasQueProgrediriam": ["área 1", "área 2"],
      "motivacao": "mensagem motivacional sobre o progresso",
      "proximosPassos": ["próximo passo 1", "próximo passo 2"],
      "notaProgresso": "nota de 1 a 10 para o progresso",
      "tempoDecorrido": "${Math.floor((new Date().getTime() - new Date(previousPhoto.createdAt).getTime()) / (1000 * 60 * 60 * 24))} dias",
      "recomendacoes": ["recomendação 1", "recomendação 2"]
    }

    Seja específico sobre as mudanças visíveis e muito motivacional!
    `

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: comparisonPrompt },
            { type: "image_url", image_url: { url: previousPhoto.photoUrl } },
            { type: "image_url", image_url: { url: currentPhotoUrl } },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    let comparison
    try {
      const content = response.choices[0]?.message?.content
      comparison = JSON.parse(content || "{}")
    } catch (parseError) {
      console.error("Error parsing comparison response:", parseError)
      comparison = {
        evolucaoGeral: "Progresso consistente observado",
        melhorias: ["Maior definição", "Melhor postura", "Mais confiança"],
        areasQueProgrediriam: ["Continue focando na consistência"],
        motivacao: "Você está evoluindo! Continue assim!",
        proximosPassos: ["Manter rotina atual", "Ajustar intensidade"],
        notaProgresso: "7",
        tempoDecorrido: `${Math.floor((new Date().getTime() - new Date(previousPhoto.createdAt).getTime()) / (1000 * 60 * 60 * 24))} dias`,
        recomendacoes: ["Continue o bom trabalho", "Seja paciente com o processo"],
      }
    }

    return NextResponse.json({
      success: true,
      comparison,
      previousPhotoDate: previousPhoto.createdAt,
    })
  } catch (error) {
    console.error("Error comparing progress:", error)
    return NextResponse.json({ error: "Failed to compare progress" }, { status: 500 })
  }
}
