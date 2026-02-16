"use client"

import { Card } from "@/components/ui/card"
import { Settings as SettingsIcon, Bell, Lock, Database } from "lucide-react"

export default function SettingsPage() {
  const sections = [
    {
      title: "Permissões & Segurança",
      icon: <Lock className="w-5 h-5" />,
      items: ["Gerenciar admins", "Roles e permissões", "Audit trail"],
    },
    {
      title: "Integrações",
      icon: <Database className="w-5 h-5" />,
      items: ["Asaas (Pagamentos)", "Meta Ads", "TikTok", "Resend (Email)"],
    },
    {
      title: "Notificações",
      icon: <Bell className="w-5 h-5" />,
      items: ["Alertas de pagamento", "Notificações de lead", "Email de relatórios"],
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-slate-400">Gerenciar configurações do admin</p>
      </div>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <Card key={idx} className="bg-slate-900 border-slate-800 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-lime-500/10 rounded-lg text-lime-400">{section.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-3">{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-center gap-2 text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">
                Configurar
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-500/10 border border-blue-500/30 p-6">
        <h3 className="text-lg font-bold text-blue-400 mb-2">Informações do Sistema</h3>
        <div className="space-y-2 text-blue-300 text-sm">
          <p>Versão: 1.0.0</p>
          <p>Ambiente: Produção</p>
          <p>Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </Card>
    </div>
  )
}
