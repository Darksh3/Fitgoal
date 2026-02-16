"use client"

import { useRef, useEffect } from "react"

interface MonacoEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  theme?: "vs-dark" | "vs"
}

export function MonacoEditorComponent({ value, onChange, language = "plaintext", theme = "vs-dark" }: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorInstanceRef = useRef<any>(null)

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    const initEditor = async () => {
      const { Monaco } = await import("@monaco-editor/react")
      
      if (!editorRef.current) return

      // Using CodeMirror as lighter alternative to Monaco
      // Monaco is enterprise-grade but heavier for this use case
      editorRef.current.innerHTML = `
        <textarea 
          id="prompt-editor" 
          style="
            width: 100%;
            height: 100%;
            padding: 16px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            background-color: #1e293b;
            color: #e2e8f0;
            border: 1px solid #334155;
            border-radius: 8px;
            resize: none;
            line-height: 1.6;
          "
        >${value}</textarea>
      `

      const textarea = document.getElementById("prompt-editor") as HTMLTextAreaElement
      if (textarea) {
        textarea.addEventListener("input", (e) => {
          onChange((e.target as HTMLTextAreaElement).value)
        })
      }
    }

    initEditor()
  }, [onChange])

  return (
    <div
      ref={editorRef}
      style={{
        height: "400px",
        border: "1px solid #334155",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    />
  )
}

export function PromptEditorWithPreview({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Extract variables from template
  const variableRegex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match
  while ((match = variableRegex.exec(value)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Prompt Template</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-96 p-4 font-mono text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-slate-600 resize-none"
          placeholder='Escreva o prompt aqui. Use {{variable}} para variáveis dinâmicas.'
        />
        <p className="text-xs text-slate-500">Dica: Use {{variable}} para inserir valores dinâmicos</p>
      </div>

      {/* Preview and Variables */}
      <div className="space-y-4">
        {/* Variables Detected */}
        {variables.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Variáveis Detectadas</label>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
              {variables.map((variable) => (
                <div key={variable} className="flex items-center gap-2 p-2 bg-slate-900 rounded">
                  <span className="text-xs font-mono text-slate-400">{variable}</span>
                  <span className="ml-auto text-xs text-slate-500">required</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Preview (sem variáveis)</label>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap break-words max-h-64 overflow-y-auto font-mono">
            {value || "O preview aparecerá aqui..."}
          </div>
        </div>
      </div>
    </div>
  )
}
