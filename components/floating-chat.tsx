"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send, Loader2, Minimize2, Sparkles } from "@/lib/icons"

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleOpenChat = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  useEffect(() => {
    window.addEventListener("openFloatingChat", handleOpenChat)
    return () => {
      window.removeEventListener("openFloatingChat", handleOpenChat)
    }
  }, [handleOpenChat])

  const quickQuestions = useMemo(
    () => [
      "Qual o melhor plano para mim?",
      "Quais são os preços?",
      "Diferença entre os planos?",
      "Como funciona o pagamento?",
      "Posso cancelar quando quiser?",
      "Aceita criptomoedas?",
    ],
    [],
  )

  const handleQuickQuestion = useCallback((question: string) => {
    setInput(question)
    handleSendMessage(question)
  }, [])

  const handleSendMessage = useCallback(
    async (customPrompt?: string) => {
      const messageText = customPrompt || input
      if (messageText.trim() === "" || loading) return

      const userMessage = { role: "user" as const, content: messageText }
      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setLoading(true)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: messageText }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        const assistantMessage = { role: "assistant" as const, content: data.response }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Iza aqui! Problema de conexão. WhatsApp direto: (11) 99999-9999 💪",
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [input, loading],
  )

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage],
  )

  const toggleOpen = useCallback(() => setIsOpen(true), [])
  const toggleClose = useCallback(() => setIsOpen(false), [])
  const toggleMinimize = useCallback(() => setIsMinimized(!isMinimized), [isMinimized])

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg z-50 transition-all duration-200 hover:scale-105"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[calc(100vw-2rem)] max-w-xs h-96 shadow-2xl z-50 flex flex-col bg-white border-2 border-purple-200 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <Sparkles className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">Iza - Consultora ATHLIX</CardTitle>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMinimize}
                  className="h-6 w-6 p-0 text-white hover:bg-purple-800 transition-colors"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleClose}
                  className="h-6 w-6 p-0 text-white hover:bg-purple-800 transition-colors"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {!isMinimized && (
            <>
              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-purple-50 to-blue-50">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="text-center text-gray-700 text-sm">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Sparkles className="h-6 w-6 text-white" />
                      </div>
                      <div className="font-medium">Oi! Sou a Iza 💪</div>
                      <div className="text-xs text-gray-500">Consultora fitness da ATHLIX</div>
                    </div>
                    <div className="space-y-2">
                      {quickQuestions.map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickQuestion(question)}
                          className="w-full text-xs h-8 text-left justify-start hover:bg-purple-50 border-purple-200"
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white ml-auto rounded-br-sm"
                        : "bg-white text-gray-800 mr-auto border shadow-sm rounded-bl-sm border-purple-100"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center space-x-2 text-gray-600 text-sm bg-white p-3 rounded-lg mr-auto max-w-[85%] border shadow-sm border-purple-100">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span>Iza analisando...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Input */}
              <CardFooter className="p-3 border-t bg-white border-purple-100">
                <div className="flex w-full space-x-2">
                  <Input
                    placeholder="Conte sobre seu objetivo..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 text-sm border-purple-300 focus:border-purple-500 focus:ring-purple-500"
                    disabled={loading}
                    maxLength={300}
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={loading || input.trim() === ""}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center w-full">
                  Iza • Consultora Fitness • WhatsApp: (11) 99999-9999
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      )}
    </>
  )
}
