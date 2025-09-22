"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, X, Send, Sparkles } from "lucide-react"

interface ChatMessage {
  id: string
  type: "iza" | "user"
  content: string
  timestamp: Date
  isAnalysis?: boolean
  analysisData?: any
}

interface IzaChatProps {
  onNewAnalysis?: (analysis: any) => void
}

export default function IzaChat({ onNewAnalysis }: IzaChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "iza",
      content:
        "Olá! Eu sou a Iza, sua assistente fitness. Estou aqui para te ajudar com análises de progresso e dicas personalizadas! 💪",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Listen for new analysis results
  useEffect(() => {
    const handleAnalysisComplete = (event: CustomEvent) => {
      console.log("[v0] IzaChat received photoAnalysisComplete event:", event.detail)
      const analysisData = event.detail

      // Open chat automatically
      console.log("[v0] Opening Iza chat automatically")
      setIsOpen(true)

      // Add analysis message from Iza
      const analysisMessage: ChatMessage = {
        id: Date.now().toString(),
        type: "iza",
        content: formatAnalysisMessage(analysisData),
        timestamp: new Date(),
        isAnalysis: true,
        analysisData,
      }

      console.log("[v0] Adding analysis message to chat:", analysisMessage)
      setMessages((prev) => [...prev, analysisMessage])

      if (onNewAnalysis) {
        onNewAnalysis(analysisData)
      }
    }

    console.log("[v0] IzaChat: Adding event listener for photoAnalysisComplete")
    window.addEventListener("photoAnalysisComplete", handleAnalysisComplete as EventListener)

    return () => {
      console.log("[v0] IzaChat: Removing event listener for photoAnalysisComplete")
      window.removeEventListener("photoAnalysisComplete", handleAnalysisComplete as EventListener)
    }
  }, [onNewAnalysis])

  const formatAnalysisMessage = (analysis: any) => {
    if (!analysis) return "Análise concluída! ✨"

    let message = `🎉 **Análise da sua foto concluída!**\n\n`

    if (analysis.motivacao) {
      message += `💪 **Feedback geral:**\n${analysis.motivacao}\n\n`
    }

    if (analysis.pontosForts && analysis.pontosForts.length > 0) {
      message += `✅ **Pontos fortes identificados:**\n`
      analysis.pontosForts.slice(0, 2).forEach((ponto: string) => {
        message += `• ${ponto}\n`
      })
      message += `\n`
    }

    if (analysis.focoPrincipal) {
      message += `🎯 **Foco principal:** ${analysis.focoPrincipal}\n\n`
    }

    if (analysis.otimizacaoNecessaria && analysis.otimizacoesSugeridas) {
      message += `🔧 **Otimizações sugeridas:**\n`

      if (analysis.otimizacoesSugeridas.dieta?.necessaria) {
        message += `🥗 **Dieta:** ${analysis.otimizacoesSugeridas.dieta.justificativa}\n`
      }

      if (analysis.otimizacoesSugeridas.treino?.necessaria) {
        message += `🏋️ **Treino:** ${analysis.otimizacoesSugeridas.treino.justificativa}\n`
      }

      message += `\nQuer que eu aplique essas otimizações automaticamente? 🤔`
    } else {
      message += `Continue assim! Seu progresso está no caminho certo! 🚀`
    }

    return message
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage("")
    setIsTyping(true)

    // Simulate Iza response
    setTimeout(() => {
      const izaResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "iza",
        content: generateIzaResponse(inputMessage),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, izaResponse])
      setIsTyping(false)
    }, 1500)
  }

  const generateIzaResponse = (userInput: string) => {
    const responses = [
      "Entendi! Vou te ajudar com isso. Continue focado nos seus objetivos! 💪",
      "Ótima pergunta! Lembre-se que consistência é a chave para o sucesso. 🔑",
      "Estou aqui para te apoiar! Cada pequeno progresso conta muito. ✨",
      "Perfeito! Vamos manter esse ritmo e alcançar seus objetivos juntos! 🚀",
      "Excelente! Continue assim que os resultados vão aparecer. 🎯",
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  const formatMessageContent = (content: string) => {
    return content.split("\n").map((line, index) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <div key={index} className="font-semibold text-purple-800 mb-1">
            {line.slice(2, -2)}
          </div>
        )
      }
      if (line.startsWith("•")) {
        return (
          <div key={index} className="ml-2 text-sm">
            {line}
          </div>
        )
      }
      return (
        <div key={index} className="mb-1">
          {line}
        </div>
      )
    })
  }

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg z-50"
          size="sm"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 h-96 shadow-2xl z-50 bg-white border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">Iza - Assistente Fitness</CardTitle>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs opacity-90">Online</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col h-80">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      message.type === "user"
                        ? "bg-purple-600 text-white"
                        : message.isAnalysis
                          ? "bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.type === "iza" && (
                      <div className="flex items-center space-x-1 mb-1">
                        <Sparkles className="h-3 w-3 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">Iza</span>
                        {message.isAnalysis && <Badge className="text-xs bg-green-100 text-green-800">Análise</Badge>}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{formatMessageContent(message.content)}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <div className="flex items-center space-x-1">
                      <Sparkles className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">Iza</span>
                    </div>
                    <div className="flex space-x-1 mt-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
