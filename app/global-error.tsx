'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold mb-4">Algo deu errado!</h2>
            <button
              onClick={() => reset()}
              className="mt-4 px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
