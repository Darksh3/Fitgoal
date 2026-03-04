'use client'

import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Send, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminAgentPage() {
  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/admin/agent',
    }),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    sendMessage({ text: input })
    setInput('')
  }

  const getMessageText = (message: any): string => {
    if (typeof message.content === 'string') {
      return message.content
    }
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('')
    }
    return ''
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-800 p-6">
          <h1 className="text-3xl font-bold">Assistente de IA - Admin</h1>
          <p className="text-slate-400 mt-2">Pergunte algo sobre seus dados, leads, usuários ou métricas</p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Bem-vindo ao Assistente Admin</h2>
                <p className="text-slate-400 mb-4">Você pode fazer perguntas como:</p>
                <ul className="text-slate-300 space-y-2 text-left max-w-md mx-auto">
                  <li>• "Quantos leads temos no total?"</li>
                  <li>• "Qual é a taxa de conversão?"</li>
                  <li>• "Me mostre as métricas de pagamento"</li>
                  <li>• "Quantos usuários têm planos?"</li>
                  <li>• "Buscar leads de João"</li>
                </ul>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {getMessageText(message)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-lg px-4 py-3 flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-slate-300">Assistente pensando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="border-t border-slate-800 p-6 bg-slate-900">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Faça uma pergunta sobre seus dados..."
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
