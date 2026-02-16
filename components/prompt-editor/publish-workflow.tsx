"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, GitBranch, Check, Clock, AlertCircle } from "lucide-react"
import { AuditLog } from "@/lib/schemas/prompt"

interface PublishWorkflowProps {
  promptId: string
  promptKey: string
  currentStatus: "draft" | "published" | "archived"
  currentVersion: number
  auditLogs: AuditLog[]
  onPublish: () => void
  onRollback: (versionId: string) => void
  requiresApproval?: boolean
}

export function PublishWorkflow({
  promptId,
  promptKey,
  currentStatus,
  currentVersion,
  auditLogs,
  onPublish,
  onRollback,
  requiresApproval = false,
}: PublishWorkflowProps) {
  const publishLogs = auditLogs.filter((log) => log.action === "publish")
  const lastPublished = publishLogs[0]

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Publish & Version Control</h3>

      {/* Current Status */}
      <Card className="bg-slate-900 border-slate-800 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentStatus === "published"
                    ? "bg-green-500"
                    : currentStatus === "draft"
                      ? "bg-yellow-500"
                      : "bg-slate-500"
                }`}
              />
              <p className="text-sm font-medium text-white capitalize">{currentStatus}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Version</p>
            <p className="text-sm font-mono text-white">v{currentVersion}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Last Published</p>
            <p className="text-sm text-slate-400">
              {lastPublished
                ? new Date(lastPublished.created_at.toDate()).toLocaleDateString("pt-BR")
                : "Nunca publicado"}
            </p>
          </div>
        </div>
      </Card>

      {/* Publish Action */}
      {currentStatus === "draft" && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300 mb-3">
            {requiresApproval
              ? "Este prompt requer aprovação para ser publicado."
              : "Pronto para publicar esta versão em produção?"}
          </p>
          <Button onClick={onPublish} className="gap-2">
            <FileText className="w-4 h-4" />
            Publicar Versão {currentVersion}
          </Button>
        </div>
      )}

      {/* Approval System (Fase 5) */}
      {requiresApproval && currentStatus === "draft" && (
        <Card className="bg-yellow-500/10 border border-yellow-500/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <p className="text-sm font-medium text-yellow-300">Aguardando Aprovação</p>
          </div>
          <p className="text-xs text-yellow-200">Admin precisa revisar e aprovar antes de publicar</p>
        </Card>
      )}

      {/* Version History */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Histórico de Versões
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma alteração registrada</p>
          ) : (
            auditLogs.map((log, idx) => (
              <Card key={log.id} className="bg-slate-800 border-slate-700 p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {log.action === "publish" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-blue-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{log.action}</p>
                      <p className="text-xs text-slate-400">{log.actor_id}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{new Date(log.created_at.toDate()).toLocaleString("pt-BR")}</p>
                </div>
                {log.reason && <p className="text-xs text-slate-300 ml-6">{log.reason}</p>}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Rollback (if published) */}
      {currentStatus === "published" && publishLogs.length > 1 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-xs text-red-300 mb-3">Fazer rollback para versão anterior?</p>
          <Button variant="outline" size="sm" onClick={() => onRollback(promptId)}>
            Reverter para v{currentVersion - 1}
          </Button>
        </div>
      )}
    </div>
  )
}
