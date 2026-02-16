"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Plus, Trash2, Check, AlertCircle, Clock } from "lucide-react"

interface Fixture {
  id: string
  name: string
  payload_json: Record<string, any>
  description?: string
}

interface TestResult {
  success: boolean
  output: string
  model: string
  tokens: number
  latency_ms: number
  cost: number
  error?: string
}

interface TestRunnerProps {
  promptKey: string
  fixtures: Fixture[]
  onRunTest: (fixtureId: string) => Promise<TestResult>
  onCreateFixture: (fixture: Omit<Fixture, "id">) => void
}

export function TestRunner({ promptKey, fixtures, onRunTest, onCreateFixture }: TestRunnerProps) {
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(fixtures[0]?.id || null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showNewFixture, setShowNewFixture] = useState(false)
  const [newFixtureName, setNewFixtureName] = useState("")
  const [newFixturePayload, setNewFixturePayload] = useState("{}")

  const handleRunTest = async () => {
    if (!selectedFixtureId) return

    setIsRunning(true)
    try {
      const result = await onRunTest(selectedFixtureId)
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        output: "",
        model: "",
        tokens: 0,
        latency_ms: 0,
        cost: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleCreateFixture = () => {
    try {
      const payload = JSON.parse(newFixturePayload)
      onCreateFixture({
        name: newFixtureName,
        payload_json: payload,
        description: `Test fixture for ${promptKey}`,
      })
      setNewFixtureName("")
      setNewFixturePayload("{}")
      setShowNewFixture(false)
    } catch (error) {
      alert("Invalid JSON payload")
    }
  }

  const selectedFixture = fixtures.find((f) => f.id === selectedFixtureId)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Test Prompt</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Fixtures List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Fixtures</label>
            <Button size="sm" onClick={() => setShowNewFixture(!showNewFixture)} variant="outline" className="gap-1">
              <Plus className="w-3 h-3" />
              Nova
            </Button>
          </div>

          {showNewFixture && (
            <Card className="bg-slate-900 border-slate-800 p-3 space-y-2">
              <input
                type="text"
                placeholder="Nome da fixture"
                value={newFixtureName}
                onChange={(e) => setNewFixtureName(e.target.value)}
                className="w-full px-3 py-1 text-sm bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none"
              />
              <textarea
                placeholder='{"key": "value"}'
                value={newFixturePayload}
                onChange={(e) => setNewFixturePayload(e.target.value)}
                className="w-full h-24 p-2 text-xs font-mono bg-slate-800 border border-slate-700 rounded text-slate-100 focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateFixture}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewFixture(false)}>
                  Cancelar
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {fixtures.map((fixture) => (
              <button
                key={fixture.id}
                onClick={() => setSelectedFixtureId(fixture.id)}
                className={`w-full p-2 text-left text-sm rounded transition-colors ${
                  selectedFixtureId === fixture.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <p className="font-medium">{fixture.name}</p>
                <p className="text-xs opacity-75">{Object.keys(fixture.payload_json).length} variables</p>
              </button>
            ))}
          </div>
        </div>

        {/* Payload Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Payload</label>
          {selectedFixture ? (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-words">
                {JSON.stringify(selectedFixture.payload_json, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-500 text-sm">
              Selecione uma fixture
            </div>
          )}
        </div>
      </div>

      {/* Run Button */}
      <Button
        onClick={handleRunTest}
        disabled={!selectedFixture || isRunning}
        className="w-full gap-2"
      >
        <Play className="w-4 h-4" />
        {isRunning ? "Executando..." : "Executar Teste"}
      </Button>

      {/* Test Result */}
      {testResult && (
        <Card className="bg-slate-900 border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Sucesso</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Erro</span>
              </>
            )}
          </div>

          {testResult.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-sm text-red-300">
              {testResult.error}
            </div>
          )}

          {testResult.success && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Output</label>
                <div className="bg-slate-800 rounded p-2 text-sm text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                  {testResult.output}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-800 rounded p-2">
                  <p className="text-slate-500">Model</p>
                  <p className="text-white font-mono">{testResult.model}</p>
                </div>
                <div className="bg-slate-800 rounded p-2">
                  <p className="text-slate-500">Tokens</p>
                  <p className="text-white font-mono">{testResult.tokens}</p>
                </div>
                <div className="bg-slate-800 rounded p-2 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <div>
                    <p className="text-slate-500">Latency</p>
                    <p className="text-white font-mono">{testResult.latency_ms}ms</p>
                  </div>
                </div>
                <div className="bg-slate-800 rounded p-2">
                  <p className="text-slate-500">Custo</p>
                  <p className="text-white font-mono">${testResult.cost.toFixed(4)}</p>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
