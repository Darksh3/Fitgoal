import { ReactNode, Suspense } from 'react'

export default function CheckoutOfertaLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      {children}
    </Suspense>
  )
}
