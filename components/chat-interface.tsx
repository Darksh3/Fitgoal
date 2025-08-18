"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Loader2 } from "lucide-react"

export default function ChatInterface() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async () => {
    if (input.trim() === "") return

    const userMessage = { role: "user" as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
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
        { role: "assistant", content: "Desculpe, houve um erro ao processar sua solicitação." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-800 border-gray-700 text-white flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="text-center">Seu Assistente de IA</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">Comece a conversar com seu assistente de IA!</div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              msg.role === "user" ? "bg-lime-600 ml-auto text-right" : "bg-gray-700 mr-auto text-left"
            }`}
            style={{ maxWidth: "80%" }}
          >
            <p className="font-bold text-sm mb-1">{msg.role === "user" ? "Você" : "Assistente"}</p>
            <p>{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="flex items-center justify-center p-3">
            <Loader2 className="h-6 w-6 animate-spin text-lime-500" />
            <span className="ml-2 text-gray-400">Digitando...</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t border-gray-700">
        <div className="flex w-full space-x-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !loading) {
                handleSendMessage()
              }
            }}
            className="flex-1 bg-gray-700 border-gray-600 text-white"
            disabled={loading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || input.trim() === ""}
            className="bg-lime-500 hover:bg-lime-600 text-white"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
