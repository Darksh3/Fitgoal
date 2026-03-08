import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Página não encontrada</p>
        <Link href="/" className="text-primary hover:underline">
          Voltar para a página inicial
        </Link>
      </div>
    </div>
  )
}
