import { type NextRequest, NextResponse } from "next/server"
import { openai } from "ai"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { photoUrl, photoType, userId, userQuizData } = await request.json()

    if (!photoUrl || !photoType || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const analysisPrompt = `
    Você é um personal trainer e nutricionista especialista em análise corporal. Analise esta foto de progresso fitness e forneça um feedback detalhado e motivacional.

    Tipo de foto: ${photoType === "front" ? "Frente" : photoType === "back" ? "Costas" : "Lateral"}
    
    Dados do usuário:
    - Objetivo: ${userQuizData?.goal || "Não informado"}
    - Biotipo: ${userQuizData?.bodyType || "Não informado"}
    - Experiência: ${userQuizData?.experience || "Não informado"}
    - Peso atual: ${userQuizData?.currentWeight || "Não informado"}kg
    - Meta de peso: ${userQuizData?.goalWeight || "Não informado"}kg

    Forneça uma análise em JSON com esta estrutura:
    {
      "pontosForts": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
      "areasParaMelhorar": ["área 1", "área 2", "área 3"],
      "dicasEspecificas": ["dica 1", "dica 2", "dica 3"],
      "motivacao": "mensagem motivacional personalizada",
      "focoPrincipal": "principal área que precisa de atenção",
      "progressoGeral": "avaliação geral do físico atual",
      "recomendacoesTreino": ["recomendação 1", "recomendação 2"],
      "recomendacoesDieta": ["recomendação 1", "recomendação 2"]
    }

    Seja específico, motivacional e profissional. Base suas observações no que consegue ver na foto.
    `

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    let analysis
    try {
      const content = response.choices[0]?.message?.content
      analysis = JSON.parse(content || "{}")
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      analysis = {
        pontosForts: ["Postura adequada", "Comprometimento com o processo", "Boa disposição para mudança"],
        areasParaMelhorar: ["Definição muscular", "Composição corporal", "Simetria"],
        dicasEspecificas: [
          "Mantenha consistência no treino",
          "Foque na alimentação balanceada",
          "Hidrate-se adequadamente",
        ],
        motivacao: "Você está no caminho certo! Cada foto é um passo em direção ao seu objetivo.",
        focoPrincipal: "Consistência no treino e dieta",
        progressoGeral: "Bom ponto de partida para evolução",
        recomendacoesTreino: ["Treino de força 3x por semana", "Cardio moderado"],
        recomendacoesDieta: ["Aumente proteínas", "Controle carboidratos"],
      }
    }

    const photoData = {
      userId,
      photoUrl,
      photoType,
      analysis,
      createdAt: new Date().toISOString(),
      userQuizData: userQuizData || {},
    }

    const docRef = await adminDb.collection("progressPhotos").add(photoData)

    return NextResponse.json({
      success: true,
      analysis,
      photoId: docRef.id,
    })
  } catch (error) {
    console.error("Error analyzing photo:", error)
    return NextResponse.json({ error: "Failed to analyze photo" }, { status: 500 })
  }
}
