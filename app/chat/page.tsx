import ChatInterface from "@/components/chat-interface"

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-white text-center mb-8">Assistente de Fitness com IA</h1>
        <ChatInterface />
      </div>
    </div>
  )
}
